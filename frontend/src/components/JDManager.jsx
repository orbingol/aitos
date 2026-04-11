import { useState } from 'react';
import { jdService } from '../services/api';

const JDManager = ({ jds, onRefresh }) => {
  const [selectedJD, setSelectedJD] = useState(null);
  const [fullJD, setFullJD] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newJDTitle, setNewJDTitle] = useState('');
  const [newJDText, setNewJDText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadFullJD = async (jd) => {
    try {
      const fullJDData = await jdService.getJD(jd.id);
      setFullJD(fullJDData);
      setSelectedJD(jd);
    } catch (error) {
      alert('Failed to load JD details: ' + error.message);
    }
  };

  const filteredJDs = jds.filter(jd =>
    (jd.title && jd.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (jd.preview && jd.preview.toLowerCase().includes(searchTerm.toLowerCase())) ||
    jd.id.toLowerCase().includes(searchTerm.toLowerCase())
  );  const handleCreate = async () => {
    if (!newJDText.trim() || !newJDTitle.trim()) return;

    try {
      await jdService.createJD(newJDTitle, newJDText);
      setNewJDTitle('');
      setNewJDText('');
      setIsCreating(false);
      onRefresh();
    } catch (error) {
      alert('Failed to create JD: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this Job Description?')) return;

    try {
      await jdService.deleteJD(id);
      onRefresh();
      if (selectedJD?.id === id) {
        setSelectedJD(null);
        setFullJD(null);
      }
    } catch (error) {
      alert('Failed to delete JD: ' + error.message);
    }
  };

  const handleEdit = () => {
    setEditTitle(fullJD?.title || '');
    setEditText(fullJD?.text || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await jdService.updateJD(selectedJD.id, editTitle, editText);
      setIsEditing(false);
      onRefresh();
      // Update the full JD with new data
      const updatedJD = await jdService.getJD(selectedJD.id);
      setFullJD(updatedJD);
    } catch (error) {
      alert('Failed to update JD: ' + error.message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditText('');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Job Descriptions
        </h1>
        <p className="text-lg text-gray-600">
          Create, edit, and manage job descriptions for analysis
        </p>
      </div>

      <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-6">
        <div className="flex-shrink-0">
          <button
            className="btn-primary flex items-center space-x-2"
            onClick={() => setIsCreating(true)}
          >
            <span>➕</span>
            <span>Create New JD</span>
          </button>
        </div>

        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="🔍 Search Job Descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-soft-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Job Description</h3>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                onClick={() => setIsCreating(false)}
              >
                ❌
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={newJDTitle}
                onChange={(e) => setNewJDTitle(e.target.value)}
                placeholder="Enter job title..."
                className="input-field"
              />
              <textarea
                value={newJDText}
                onChange={(e) => setNewJDText(e.target.value)}
                placeholder="Enter job description text..."
                className="textarea-field"
                rows="15"
              />
              <div className="flex items-center justify-end space-x-3">
                <button
                  className="btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  ❌ Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreate}
                  disabled={!newJDText.trim() || !newJDTitle.trim()}
                >
                  💾 Create JD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Job Descriptions ({filteredJDs.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredJDs.map((jd) => (
                <div
                  key={jd.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                    selectedJD?.id === jd.id
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => loadFullJD(jd)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 truncate flex items-center space-x-2">
                      <span>💼</span>
                      <span>{jd.title || `JD ${jd.id.slice(0, 8)}...`}</span>
                    </span>
                    <button
                      className="text-red-600 hover:text-red-800 p-1 rounded transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(jd.id);
                      }}
                      title="Delete JD"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {jd.preview || 'No preview available'}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {new Date(jd.createdAt).toLocaleDateString()}
                    </span>
                    <span>{jd.preview ? jd.preview.length + '+ chars' : 'Unknown length'}</span>
                  </div>
                </div>
              ))}

              {filteredJDs.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">💼</div>
                  <p className="text-gray-500">
                    {searchTerm ? 'No JDs match your search' : 'No job descriptions created yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedJD ? (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {fullJD?.title || selectedJD?.title || `JD ${selectedJD.id.slice(0, 8)}...`}
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
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Job title..."
                      className="input-field"
                    />
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="textarea-field"
                      placeholder="Edit job description..."
                      rows="20"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="whitespace-pre-wrap text-sm text-gray-700">
                      {fullJD?.text || 'Loading...'}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">ID:</span>
                    <span className="text-gray-600 font-mono">{selectedJD.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="text-gray-600">{new Date(selectedJD.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Characters:</span>
                    <span className="text-gray-600">{fullJD?.text?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Words:</span>
                    <span className="text-gray-600">{fullJD?.text?.split(/\s+/).length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-16">
                <div className="text-6xl mb-4">💼</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Job Description</h3>
                <p className="text-gray-600">Choose a JD from the list to view, edit, or delete it</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JDManager;
