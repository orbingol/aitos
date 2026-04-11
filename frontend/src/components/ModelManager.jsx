import { useState, useEffect } from 'react';
import { ollamaService } from '../services/api';

const ModelManager = () => {
  const [models, setModels] = useState([]);
  const [recommendedModels, setRecommendedModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [error, setError] = useState(null);
  const [recommendationsError, setRecommendationsError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [installProgress, setInstallProgress] = useState(null);

  useEffect(() => {
    loadModels();
    loadRecommendedModels();
  }, []);

  const loadRecommendedModels = async () => {
    try {
      setLoadingRecommendations(true);
      setRecommendationsError(null);
      const data = await ollamaService.getRecommendedModels();
      setRecommendedModels(data.models || []);
    } catch (error) {
      setRecommendedModels([]);
      setRecommendationsError('Failed to load recommended models: ' + error.message);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await ollamaService.getModels();
      setModels(data.models || []);
    } catch (error) {
      setError('Failed to load models: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshModelData = () => {
    loadModels();
    loadRecommendedModels();
  };

  const handleInstallModel = async (e) => {
    e.preventDefault();
    if (!newModelName.trim()) return;

    setIsInstalling(true);
    setError(null);
    setSuccess(null);
    setInstallProgress('Starting installation...');

    try {
      const modelName = newModelName.trim();

      const response = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start model installation');
      }

      setInstallProgress('Model installation started. This may take several minutes...');

      // Check for model completion
      const checkModel = async () => {
        try {
          const data = await ollamaService.getModels();
          const installedModel = data.models?.find(m => m.name === modelName);

          if (installedModel) {
            setSuccess(`Model "${modelName}" installed successfully!`);
            setInstallProgress(null);
            setIsInstalling(false);
            setNewModelName('');
            loadModels();
            return true;
          }
          setTimeout(checkModel, 2000);
          return false;
        } catch (error) {
          if (error.message.includes('model not found')) {
            setInstallProgress('Still installing... Please wait.');
          } else {
            setError(error.message);
            setInstallProgress(null);
            setIsInstalling(false);
            return true;
          }
          setTimeout(checkModel, 2000);
          return false;
        }
      };

      // Start checking for model availability
      setTimeout(checkModel, 1000);

    } catch (error) {
      setError(error.message);
      setInstallProgress(null);
      setIsInstalling(false);
    }
  };

  const handleDeleteModel = async (modelName) => {
    if (!confirm(`Are you sure you want to delete the model "${modelName}"?`)) {
      return;
    }

    try {
      await ollamaService.deleteModel(modelName);
      setSuccess(`Model "${modelName}" deleted successfully!`);
      loadModels();
    } catch (error) {
      setError('Failed to delete model: ' + error.message);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          AI Model Management
        </h1>
        <p className="text-lg text-gray-600">
          Manage Ollama models for CV analysis
        </p>
      </div>

      <div className="space-y-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>📦</span>
              <span>Install New Model</span>
            </h3>
          </div>
          <form onSubmit={handleInstallModel} className="space-y-4">
            <div className="flex space-x-4">
              <input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Enter model name (e.g., llama2, codellama, mistral)"
                disabled={isInstalling}
                className="input-field flex-1"
              />
              <button
                type="submit"
                disabled={isInstalling || !newModelName.trim()}
                className={`btn-primary px-6 ${
                  isInstalling || !newModelName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isInstalling ? '⏳ Installing...' : '📦 Install'}
              </button>
            </div>

            {installProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
                <div className="flex items-center space-x-2">
                  <span className="animate-spin">⏳</span>
                  <span>{installProgress}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                <div className="flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                <div className="flex items-center space-x-2">
                  <span>✅</span>
                  <span>{success}</span>
                </div>
              </div>
            )}

            {(loadingRecommendations || recommendationsError || recommendedModels.length > 0) && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Popular Models:</h4>
                {loadingRecommendations ? (
                  <p className="text-sm text-gray-500">Loading recommended models...</p>
                ) : recommendationsError ? (
                  <p className="text-sm text-red-700">{recommendationsError}</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {recommendedModels.map((model) => (
                      <button
                        key={model.name}
                        type="button"
                        onClick={() => setNewModelName(model.name)}
                        disabled={isInstalling}
                        className="text-xs bg-white border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <span>🤖</span>
                <span>Installed Models ({models.length})</span>
              </h3>
              <button
                onClick={refreshModelData}
                disabled={loading}
                className="btn-secondary text-sm"
              >
                {loading ? '⏳' : '🔄'} Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Models...</h3>
                <p className="text-gray-500">Fetching available models from Ollama</p>
              </div>
            </div>
          ) : models.length > 0 ? (
            <div className="space-y-3">
              {models.map((model, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{model.name}</h4>
                        <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                          {formatSize(model.size)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <strong>Family:</strong>
                            <span>{model.details?.family || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <strong>Format:</strong>
                            <span>{model.details?.format || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <strong>Parameters:</strong>
                            <span>{model.details?.parameter_size || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <strong>Modified:</strong>
                            <span>{new Date(model.modified_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {model.details?.parent_model && (
                        <div className="mt-2 text-xs text-gray-500">
                          <strong>Parent Model:</strong> {model.details.parent_model}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleDeleteModel(model.name)}
                        className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors duration-200"
                        title="Delete Model"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Models Installed</h3>
              <p className="text-gray-500 mb-4">Install your first AI model to get started with CV analysis</p>
              <button
                onClick={() => setNewModelName('gemma3:latest')}
                className="btn-primary"
              >
                📦 Install gemma3:latest
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>ℹ️</span>
              <span>Model Information</span>
            </h3>
          </div>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Installation Notes:</h4>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li>Model installation can take several minutes depending on size and internet speed</li>
                <li>Larger models (13B, 30B) provide better analysis quality but require more resources</li>
                <li>Models are downloaded and stored locally by Ollama</li>
                <li>You can install multiple models and switch between them for analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelManager;
