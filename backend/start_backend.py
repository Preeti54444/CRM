import os
import sys
import uvicorn

backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

if __name__ == '__main__':
    uvicorn.run('app.main:app', host='0.0.0.0', port=8085, log_level='info')
