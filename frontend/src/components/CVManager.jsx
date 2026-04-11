import { useState } from 'react';
import PropTypes from 'prop-types';
import { cvService } from '../services/api';

const CVManager = ({ cvs, onRefresh }) => {
  const [selectedCV, setSelectedCV] = useState(null);
  const [fullCV, setFullCV] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadFullCV = async (cv) => {
    try {
      const fullCVData = await cvService.getCV(cv.id);
      setFullCV(fullCVData);
      setSelectedCV(cv);
    } catch (error) {
      alert('Failed to load CV details: ' + error.message);
    }
  };

  const filteredCVs = cvs.filter(cv =>
    cv.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await cvService.uploadCV(file);
      onRefresh();
      event.target.value = '';
    } catch (error) {
      alert('Failed to upload CV: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this CV?')) return;

    try {
      await cvService.deleteCV(id);
      onRefresh();
      if (selectedCV?.id === id) {
        setSelectedCV(null);
        setFullCV(null);
      }
    } catch (error) {
      alert('Failed to delete CV: ' + error.message);
    }
  };

  const handleEdit = () => {
    setEditText(fullCV?.text || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await cvService.updateCV(selectedCV.id, editText);
      setIsEditing(false);
      onRefresh();
      // Update the full CV with new data
      const updatedCV = await cvService.getCV(selectedCV.id);
      setFullCV(updatedCV);
    } catch (error) {
      alert('Failed to update CV: ' + error.message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText('');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          CV Management
        </h1>
        <p className="text-lg text-gray-600">
          Upload, view, edit, and manage your CV collection
        </p>
      </div>

      <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-6">
        <div className="flex-shrink-0">
          <label className="btn-primary cursor-pointer inline-flex items-center space-x-2">
            <span>{isUploading ? '⏳ Uploading...' : '📁 Upload New CV'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="🔍 Search CVs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                CVs ({filteredCVs.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCVs.map((cv) => (
                <div
                  key={cv.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                    selectedCV?.id === cv.id
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => loadFullCV(cv)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate flex items-center space-x-2">
                      <span>📄</span>
                      <span>{cv.filename}</span>
                    </span>
                    <button
                      className="text-red-600 hover:text-red-800 p-1 rounded transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(cv.id);
                      }}
                      title="Delete CV"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {new Date(cv.createdAt).toLocaleDateString()}
                    </span>
                    <span>{cv.id.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}

              {filteredCVs.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-gray-500">
                    {searchTerm ? 'No CVs match your search' : 'No CVs uploaded yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedCV ? (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedCV.filename}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {!isEditing && (
                      <button
                        className="btn-secondary flex items-center space-x-2"
                        onClick={handleEdit}
                      >
                        <span>✏️</span>
                        <span>Edit</span>
                      </button>
                    )}
                    {isEditing && (
                      <>
                        <button
                          className="btn-primary flex items-center space-x-2"
                          onClick={handleSave}
                        >
                          <span>💾</span>
                          <span>Save</span>
                        </button>
                        <button
                          className="btn-secondary flex items-center space-x-2"
                          onClick={handleCancel}
                        >
                          <span>❌</span>
                          <span>Cancel</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {isEditing ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="textarea-field"
                    placeholder="Edit CV content..."
                    rows="20"
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                      {fullCV?.text || 'Loading...'}
                    </pre>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">ID:</span>
                    <span className="text-gray-600 font-mono">{selectedCV.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Uploaded:</span>
                    <span className="text-gray-600">{new Date(selectedCV.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">File Size:</span>
                    <span className="text-gray-600">{selectedCV.fileSize || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a CV to view details</h3>
                <p className="text-gray-600">Choose a CV from the list to view, edit, or delete it</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CVManager;

CVManager.propTypes = {
  cvs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      filename: PropTypes.string.isRequired,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      fileSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  onRefresh: PropTypes.func.isRequired,
};
