/**
 * Document Manager UI Module - CRM System
 * Provides UI components for document upload, management, and validation
 * Version: 1.0.0
 */

class DocumentManagerUI {
  constructor(documentManager) {
    this.documentManager = documentManager;
    this.currentLeadId = null;
    this.uploadedFiles = {};
  }

  /**
   * Initialize UI components
   */
  initializeUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    container.innerHTML = `
      <div class="document-manager-container">
        <!-- Header -->
        <div class="document-manager-header">
          <h2>Document Management</h2>
          <div class="header-actions">
            <button class="btn btn-primary" id="btnUploadDocument">📤 Upload Document</button>
            <button class="btn btn-secondary" id="btnBulkDownload">📥 Download All</button>
            <button class="btn btn-secondary" id="btnViewRequirements">📋 Requirements</button>
          </div>
        </div>

        <!-- Document Completeness Status -->
        <div class="completeness-card" id="completenessCard">
          <div class="completeness-header">
            <h4>Document Completeness</h4>
            <span class="completeness-percentage" id="completenessPercentage">0%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill" style="width: 0%"></div>
          </div>
          <div class="completeness-details">
            <div class="detail-item">
              <span class="label">Uploaded:</span>
              <span class="value" id="uploadedCount">0</span>
            </div>
            <div class="detail-item">
              <span class="label">Pending:</span>
              <span class="value warning" id="pendingCount">0</span>
            </div>
            <div class="detail-item">
              <span class="label">Expired:</span>
              <span class="value error" id="expiredCount">0</span>
            </div>
          </div>
        </div>

        <!-- Document Categories Tabs -->
        <div class="document-tabs" id="documentTabs">
          <!-- Tabs populated by JavaScript -->
        </div>

        <!-- Documents Grid -->
        <div class="documents-grid" id="documentsGrid">
          <!-- Documents populated by JavaScript -->
        </div>

        <!-- Upload Modal -->
        <div class="modal" id="uploadModal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Upload Document</h3>
            <form id="uploadForm" class="upload-form">
              <div class="form-group">
                <label>Select Document Type *</label>
                <select id="documentType" class="form-control" required>
                  <option value="">Choose a document type...</option>
                </select>
              </div>

              <div class="document-info" id="documentInfo" style="display: none;">
                <div class="info-box">
                  <p id="documentDescription"></p>
                  <small id="documentValidity"></small>
                </div>
              </div>

              <div class="form-group">
                <label>Upload File *</label>
                <div class="file-upload-area" id="fileUploadArea">
                  <input type="file" id="documentFile" accept=".pdf,.jpg,.jpeg,.png,.webp" required style="display: none;">
                  <div class="upload-placeholder">
                    <span class="upload-icon">📁</span>
                    <p>Drag and drop your document here or click to select</p>
                    <small>PDF, JPG, PNG, WEBP (Max 5MB)</small>
                  </div>
                </div>
                <div id="filePreview" style="display: none;">
                  <div class="preview-item">
                    <span id="fileName"></span>
                    <button type="button" class="btn-remove" id="btnRemoveFile">Remove</button>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Notes (Optional)</label>
                <textarea id="documentNotes" class="form-control" placeholder="Add any notes about this document" rows="2"></textarea>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-success" id="btnSubmitUpload">Upload Document</button>
                <button type="button" class="btn btn-secondary" id="btnCancelUpload">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Document Details Modal -->
        <div class="modal" id="documentDetailsModal">
          <div class="modal-content modal-large">
            <span class="close">&times;</span>
            <div class="document-details" id="documentDetailsContent">
              <!-- Populated by JavaScript -->
            </div>
          </div>
        </div>

        <!-- Document Requirements Modal -->
        <div class="modal" id="requirementsModal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Required Documents</h3>
            <div id="requirementsContent">
              <!-- Populated by JavaScript -->
            </div>
          </div>
        </div>

        <!-- Upload WhatsApp Modal -->
        <div class="modal" id="whatsappModal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Upload via WhatsApp</h3>
            <div class="whatsapp-upload">
              <p>Send documents to your WhatsApp number:</p>
              <div class="whatsapp-number" id="whatsappNumber">
                Loading...
              </div>
              <p class="help-text">Documents will be automatically tagged and uploaded to your application</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.populateDocumentTypes();
    this.attachEventListeners();
  }

  /**
   * Populate document type select
   */
  populateDocumentTypes() {
    const select = document.getElementById('documentType');
    const categories = this.documentManager.getDocumentCategories();

    Object.entries(categories).forEach(([categoryKey, category]) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category.name;

      category.documents.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.type;
        option.textContent = doc.type;
        option.dataset.code = doc.code;
        option.dataset.validity = doc.validity;
        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    });
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Main buttons
    document.getElementById('btnUploadDocument')?.addEventListener('click', () => this.openUploadModal());
    document.getElementById('btnBulkDownload')?.addEventListener('click', () => this.downloadAllDocuments());
    document.getElementById('btnViewRequirements')?.addEventListener('click', () => this.showRequirements());

    // Upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
      uploadForm.addEventListener('submit', (e) => this.handleUploadSubmit(e));
    }

    // File upload handling
    const fileUploadArea = document.getElementById('fileUploadArea');
    const documentFile = document.getElementById('documentFile');

    if (fileUploadArea && documentFile) {
      fileUploadArea.addEventListener('click', () => documentFile.click());
      fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
      });
      fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('dragover');
      });
      fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          documentFile.files = e.dataTransfer.files;
          this.handleFileSelected(e.dataTransfer.files[0]);
        }
      });

      documentFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileSelected(e.target.files[0]);
        }
      });
    }

    // Document type change
    document.getElementById('documentType')?.addEventListener('change', (e) => {
      this.showDocumentInfo(e.target.value);
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
      });
    });

    // Cancel buttons
    document.getElementById('btnCancelUpload')?.addEventListener('click', () => {
      document.getElementById('uploadModal').style.display = 'none';
    });

    document.getElementById('btnRemoveFile')?.addEventListener('click', () => {
      document.getElementById('documentFile').value = '';
      document.getElementById('filePreview').style.display = 'none';
      document.getElementById('fileUploadArea').querySelector('.upload-placeholder').style.display = 'flex';
    });
  }

  /**
   * Handle file selection
   */
  handleFileSelected(file) {
    const filePreview = document.getElementById('filePreview');
    const uploadPlaceholder = document.getElementById('fileUploadArea').querySelector('.upload-placeholder');

    if (file) {
      document.getElementById('fileName').textContent = file.name;
      filePreview.style.display = 'block';
      uploadPlaceholder.style.display = 'none';
    }
  }

  /**
   * Show document information
   */
  showDocumentInfo(docType) {
    const docInfo = this.documentManager.getDocumentInfo(docType);
    const infoDiv = document.getElementById('documentInfo');
    const descDiv = document.getElementById('documentDescription');
    const validityDiv = document.getElementById('documentValidity');

    if (docInfo) {
      descDiv.textContent = `${docInfo.categoryName} - ${docInfo.type}`;
      validityDiv.innerHTML = `<strong>Validity:</strong> ${docInfo.validity}`;
      infoDiv.style.display = 'block';
    } else {
      infoDiv.style.display = 'none';
    }
  }

  /**
   * Open upload modal
   */
  openUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
      modal.style.display = 'block';
      document.getElementById('uploadForm').reset();
      document.getElementById('filePreview').style.display = 'none';
      document.getElementById('fileUploadArea').querySelector('.upload-placeholder').style.display = 'flex';
    }
  }

  /**
   * Handle upload form submission
   */
  async handleUploadSubmit(e) {
    e.preventDefault();

    const docType = document.getElementById('documentType').value;
    const file = document.getElementById('documentFile').files[0];
    const notes = document.getElementById('documentNotes').value;

    if (!docType || !file) {
      alert('Please select a document type and file');
      return;
    }

    const uploadBtn = document.getElementById('btnSubmitUpload');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
      const result = await this.documentManager.uploadDocument(
        this.currentLeadId,
        file,
        docType,
        'current-user',
        { notes: notes }
      );

      if (result.success) {
        alert('Document uploaded successfully!');
        document.getElementById('uploadModal').style.display = 'none';
        await this.loadDocuments();
      } else {
        alert('Error uploading document: ' + result.error);
      }
    } catch (error) {
      alert('Error uploading document: ' + error.message);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload Document';
    }
  }

  /**
   * Load documents for current lead
   */
  async loadDocuments(leadId = null) {
    if (leadId) {
      this.currentLeadId = leadId;
    }

    if (!this.currentLeadId) {
      console.warn('No lead ID set');
      return;
    }

    try {
      const result = await this.documentManager.getLeadDocuments(this.currentLeadId);

      if (result.success) {
        this.renderDocuments(result.documents);
        await this.updateCompletenessStatus();
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  /**
   * Render documents in grid
   */
  renderDocuments(documents) {
    const grid = document.getElementById('documentsGrid');
    if (!grid) return;

    if (documents.length === 0) {
      grid.innerHTML = '<div class="empty-state">No documents uploaded yet</div>';
      return;
    }

    grid.innerHTML = documents.map(doc => `
      <div class="document-card ${doc.status}">
        <div class="document-header">
          <div class="document-title">
            <span class="document-icon">${this.getDocumentIcon(doc.documentCode)}</span>
            <h4>${doc.documentType}</h4>
          </div>
          <span class="document-status ${doc.status}">${doc.status}</span>
        </div>

        <div class="document-meta">
          <p><strong>Uploaded:</strong> ${new Date(doc.uploadDate).toLocaleDateString('en-IN')}</p>
          <p><strong>File:</strong> ${doc.fileName}</p>
          <p><strong>Size:</strong> ${this.formatFileSize(doc.fileSize)}</p>
        </div>

        ${doc.ocrStatus === 'completed' ? `
          <div class="ocr-status">
            <span class="badge success">✓ OCR Processed</span>
            <small>Confidence: ${(doc.ocrConfidence * 100).toFixed(0)}%</small>
          </div>
        ` : ''}

        ${doc.extractedFields ? `
          <div class="extracted-fields">
            <details>
              <summary>Extracted Information</summary>
              <ul>
                ${Object.entries(doc.extractedFields).map(([key, value]) => `
                  <li><strong>${key}:</strong> ${value || 'Not extracted'}</li>
                `).join('')}
              </ul>
            </details>
          </div>
        ` : ''}

        ${doc.status === 'rejected' ? `
          <div class="rejection-reason">
            <p><strong>Rejection Reason:</strong> ${doc.rejectionReason}</p>
          </div>
        ` : ''}

        <div class="document-actions">
          <button class="btn-icon" title="View Details" onclick="window.documentManagerUI.viewDocumentDetails('${doc.documentId}')">👁️</button>
          <button class="btn-icon" title="Re-upload" onclick="window.documentManagerUI.reuploadDocument('${doc.documentId}')">🔄</button>
          <button class="btn-icon" title="Download" onclick="window.documentManagerUI.downloadDocument('${doc.documentId}')">⬇️</button>
          <button class="btn-icon" title="Delete" onclick="window.documentManagerUI.deleteDocument('${doc.documentId}')">🗑️</button>
        </div>

        ${doc.versions && doc.versions.length > 1 ? `
          <div class="version-history">
            <small>Versions: ${doc.versions.length}</small>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  /**
   * Get document icon based on type
   */
  getDocumentIcon(docCode) {
    const icons = {
      'AADHAAR': '🪪',
      'PAN': '🪪',
      'PASSPORT': '🛂',
      'SALARY_SLIP': '📄',
      'FORM_16': '📋',
      'BANK_STATEMENT': '🏦',
      'GST_CERT': '✓',
      'UDYAM': '🏪',
      'TITLE_DEED': '🏠',
      'PROPERTY_DOCS': '🏘️',
      'VALUATION_REPORT': '📊',
      'APPLICANT_PHOTO': '📸',
      'SANCTION_LETTER': '✉️',
      'LOAN_AGREEMENT': '📝'
    };
    return icons[docCode] || '📄';
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Update completeness status
   */
  async updateCompletenessStatus(loanType = 'Business Loan') {
    try {
      const result = await this.documentManager.getDocumentCompletenessStatus(
        this.currentLeadId,
        loanType
      );

      if (result.success) {
        const status = result.status;
        document.getElementById('completenessPercentage').textContent = `${status.completionPercentage}%`;
        document.getElementById('progressFill').style.width = `${status.completionPercentage}%`;
        document.getElementById('uploadedCount').textContent = status.uploaded;
        document.getElementById('pendingCount').textContent = status.pending.length;
        document.getElementById('expiredCount').textContent = status.expired.length;

        // Update progress bar color
        const progressFill = document.getElementById('progressFill');
        if (status.canProceedToLender) {
          progressFill.classList.add('complete');
        } else {
          progressFill.classList.remove('complete');
        }
      }
    } catch (error) {
      console.error('Error updating completeness:', error);
    }
  }

  /**
   * Download all documents
   */
  async downloadAllDocuments() {
    try {
      const result = await this.documentManager.bulkDownloadDocuments(this.currentLeadId);

      if (result.success) {
        console.log('Bulk download ready:', result.zipFileName);
        alert(`${result.documents.length} documents ready to download as ${result.zipFileName}`);
        // In production, would trigger actual ZIP download
      } else {
        alert('Error preparing download: ' + result.error);
      }
    } catch (error) {
      console.error('Error downloading documents:', error);
    }
  }

  /**
   * Download single document
   */
  downloadDocument(documentId) {
    alert('Document download to be implemented');
  }

  /**
   * View document details
   */
  async viewDocumentDetails(documentId) {
    try {
      const result = await this.documentManager.getDocument(documentId);

      if (result.success) {
        const doc = result.document;
        const modal = document.getElementById('documentDetailsModal');
        const content = document.getElementById('documentDetailsContent');

        content.innerHTML = `
          <div class="document-details-header">
            <h3>${doc.documentType}</h3>
            <span class="status-badge ${doc.status}">${doc.status}</span>
          </div>

          <div class="details-grid">
            <div class="detail-section">
              <h4>Document Information</h4>
              <p><strong>Document ID:</strong> ${doc.documentId}</p>
              <p><strong>Category:</strong> ${doc.category}</p>
              <p><strong>File:</strong> ${doc.fileName}</p>
              <p><strong>Size:</strong> ${this.formatFileSize(doc.fileSize)}</p>
              <p><strong>Uploaded:</strong> ${new Date(doc.uploadDate).toLocaleString('en-IN')}</p>
            </div>

            <div class="detail-section">
              <h4>OCR Results</h4>
              <p><strong>Status:</strong> ${doc.ocrStatus}</p>
              ${doc.ocrStatus === 'completed' ? `
                <p><strong>Confidence:</strong> ${(doc.ocrConfidence * 100).toFixed(0)}%</p>
              ` : ''}
            </div>

            ${doc.extractedFields ? `
              <div class="detail-section">
                <h4>Extracted Fields</h4>
                <ul>
                  ${Object.entries(doc.extractedFields).map(([key, value]) => `
                    <li><strong>${key}:</strong> ${value || 'Not extracted'}</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            ${doc.versions && doc.versions.length > 0 ? `
              <div class="detail-section">
                <h4>Version History</h4>
                <ul>
                  ${doc.versions.map((v, idx) => `
                    <li>Version ${v.version} - ${new Date(v.uploadDate).toLocaleString('en-IN')}</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          <div class="details-actions">
            <button class="btn btn-primary" onclick="window.documentManagerUI.approveDocument('${doc.documentId}')">Approve</button>
            <button class="btn btn-danger" onclick="window.documentManagerUI.rejectDocumentModal('${doc.documentId}')">Reject</button>
            <button class="btn btn-secondary" onclick="window.documentManagerUI.reuploadDocument('${doc.documentId}')">Re-upload</button>
          </div>
        `;

        modal.style.display = 'block';
      }
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  }

  /**
   * Approve document
   */
  async approveDocument(documentId) {
    if (!confirm('Approve this document?')) return;

    try {
      const result = await this.documentManager.approveDocument(documentId, 'current-user');

      if (result.success) {
        alert('Document approved');
        document.getElementById('documentDetailsModal').style.display = 'none';
        await this.loadDocuments();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  /**
   * Reject document
   */
  async rejectDocumentModal(documentId) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const result = await this.documentManager.rejectDocument(documentId, reason, 'current-user');

      if (result.success) {
        alert('Document rejected');
        document.getElementById('documentDetailsModal').style.display = 'none';
        await this.loadDocuments();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId) {
    if (!confirm('Delete this document?')) return;

    try {
      const result = await this.documentManager.deleteDocument(documentId, 'current-user');

      if (result.success) {
        alert('Document deleted');
        await this.loadDocuments();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  /**
   * Re-upload document
   */
  reuploadDocument(documentId) {
    alert('Re-upload functionality to be implemented');
  }

  /**
   * Show requirements
   */
  async showRequirements() {
    const modal = document.getElementById('requirementsModal');
    const content = document.getElementById('requirementsContent');

    const required = this.documentManager.getRequiredDocuments('Business Loan', 'Self-Employed');

    content.innerHTML = `
      <div class="requirements-list">
        <h4>Required Documents for Business Loan (Self-Employed)</h4>
        <ul>
          ${required.map(doc => `
            <li>${doc}</li>
          `).join('')}
        </ul>
      </div>
    `;

    modal.style.display = 'block';
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentManagerUI;
}
