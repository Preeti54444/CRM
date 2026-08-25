// Lightweight sync queue for robust background sync with retries
(function(){
  const STORAGE_KEY = 'crm_sync_queue'
  const MAX_RETRIES = 5
  const BASE_DELAY = 2000 // ms

  class SyncQueue {
    constructor(){
      this.queue = this._load()
      this.running = false
      this.workerTimer = null
      this.start()
    }

    _load(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY)
        if(!raw) return []
        const parsed = JSON.parse(raw)
        if(Array.isArray(parsed)) return parsed
      }catch(e){}
      return []
    }

    _save(){
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue)) }catch(e){ console.warn('SyncQueue: save failed', e) }
    }

    enqueue(entry){
      const item = Object.assign({id: 'q-'+Date.now()+'-'+Math.random().toString(36).slice(2), retries:0, createdAt: new Date().toISOString()}, entry)
      this.queue.push(item)
      this._save()
      this._ensureWorker()
      return item.id
    }

    getQueue(){ return this.queue.slice() }

    clear(){ this.queue = []; this._save() }

    _ensureWorker(){ if(!this.running) this.start() }

    start(){
      if(this.running) return
      this.running = true
      this._processNext()
    }

    stop(){ this.running = false; if(this.workerTimer) clearTimeout(this.workerTimer) }

    async _processNext(){
      if(!this.running) return
      if(this.queue.length === 0){ this.running = false; return }

      const item = this.queue[0]
      try{
        await this._send(item)
        // success: remove head
        this.queue.shift()
        this._save()
        // immediate next
        this.workerTimer = setTimeout(()=>this._processNext(), 200)
      }catch(err){
        item.retries = (item.retries || 0) + 1
        if(item.retries >= MAX_RETRIES){
          console.warn('SyncQueue: dropping item after max retries', item)
          this.queue.shift()
          this._save()
          this.workerTimer = setTimeout(()=>this._processNext(), 1000)
        }else{
          // exponential backoff
          const delay = BASE_DELAY * Math.pow(2, item.retries)
          console.warn('SyncQueue: retrying in', delay, 'ms', item)
          this._save()
          this.workerTimer = setTimeout(()=>this._processNext(), delay)
        }
      }
    }

    async _send(item){
      if(typeof window.API === 'undefined' || !window.API) throw new Error('API client unavailable')
      const method = (item.method || 'POST').toUpperCase()
      const endpoint = item.endpoint || '/'
      const body = item.body || null
      // Use API client methods
      if(method === 'GET'){
        await window.API.get(endpoint, { headers: item.headers || {} })
      } else if(method === 'POST'){
        await window.API.post(endpoint, body, { headers: item.headers || {} })
      } else if(method === 'PUT'){
        await window.API.put(endpoint, body, { headers: item.headers || {} })
      } else if(method === 'PATCH'){
        await window.API.patch(endpoint, body, { headers: item.headers || {} })
      } else if(method === 'DELETE'){
        await window.API.delete(endpoint, { headers: item.headers || {} })
      } else {
        throw new Error('Unsupported method')
      }
    }
  }

  window.SyncQueue = new SyncQueue()
  console.log('[SyncQueue] initialized')
})();
