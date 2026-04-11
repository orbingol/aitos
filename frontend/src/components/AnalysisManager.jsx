import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { reportService, ollamaService } from '../services/api';
import { cleanAnalysisContent } from '../utils/textCleaner';

const AnalysisManager = ({ cvs, jds, onRefresh }) => {
  const [selectedCV, setSelectedCV] = useState(null);
  const [selectedJD, setSelectedJD] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Fetch available models from Ollama
  const fetchAvailableModels = useCallback(async () => {
    try {
      setIsLoadingModels(true);
      const data = await ollamaService.getModels();

      if (data.models && data.models.length > 0) {
        const models = data.models.map(model => ({
          id: model.name,
          name: model.name,
          description: `${model.details?.family || 'Unknown'} - ${model.details?.parameter_size || 'Unknown size'}`,
          size: model.size,
          modified: model.modified_at
        }));

        setAvailableModels(models);
        // Set the first model as default if no model is selected.
        if (models.length > 0) {
          setSelectedModel((current) => current || models[0].id);
        }
      } else {
        setError('No models available in Ollama. Please install some models first.');
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setError('Failed to load available models: ' + error.message);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Load models on component mount
  useEffect(() => {
    fetchAvailableModels();
  }, [fetchAvailableModels]);

  const handleAnalyze = async () => {
    if (!selectedCV || !selectedJD) {
      setError('Please select both a CV and a Job Description');
      return;
    }

    if (!selectedModel) {
      setError('Please select an AI model');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      // First, start the analysis
      const analyzeResult = await reportService.analyzeCV(selectedCV.id, selectedJD.id, selectedModel);

      // Then fetch the complete report
      const report = await reportService.getReport(analyzeResult.reportId);

      // Transform the report data for display
      const transformedResults = {
        reportId: report.id,
        score: report.jsonReport?.overall_score || 0,
        analysis: report.humanReport,
        model: report.model,
        createdAt: report.createdAt
      };

      setResults(transformedResults);
      onRefresh(); // Refresh data to update reports list
    } catch (error) {
      setError('Analysis failed: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          CV Analysis
        </h1>
        <p className="text-lg text-gray-600">
          Analyze CVs against Job Descriptions using AI models
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CV Selection Column */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>📄</span>
              <span>Select CV</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {cvs.map((cv) => (
              <div
                key={cv.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                  selectedCV?.id === cv.id
                    ? 'bg-primary-50 border-primary-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedCV(cv)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {cv.filename}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(cv.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {cv.preview ? cv.preview.substring(0, 100) + '...' : 'No preview available'}
                </div>
              </div>
            ))}
            {cvs.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-gray-500 text-sm">No CVs available. Upload some first!</p>
              </div>
            )}
          </div>
        </div>

        {/* JD Selection Column */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>💼</span>
              <span>Select Job Description</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {jds.map((jd) => (
              <div
                key={jd.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                  selectedJD?.id === jd.id
                    ? 'bg-primary-50 border-primary-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedJD(jd)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {jd.title || `JD ${jd.id.slice(0, 8)}...`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(jd.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {jd.preview ? jd.preview.substring(0, 100) + '...' : 'No preview available'}
                </div>
              </div>
            ))}
            {jds.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💼</div>
                <p className="text-gray-500 text-sm">No Job Descriptions available. Create some first!</p>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Configuration Column */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>🔍</span>
              <span>Analysis Configuration</span>
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">AI Model:</label>
              <button
                className="p-1 text-gray-500 hover:text-primary-600 transition-colors duration-200"
                onClick={fetchAvailableModels}
                disabled={isLoadingModels}
                title="Refresh available models"
              >
                {isLoadingModels ? '⏳' : '🔄'}
              </button>
            </div>
            {isLoadingModels ? (
              <div className="text-center py-4 text-gray-500">Loading available models...</div>
            ) : availableModels.length > 0 ? (
              <>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="input-field"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {availableModels.find(m => m.id === selectedModel)?.description}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-2">
                  No models available. Please install models in Ollama first.
                </p>
                <button
                  className="btn-secondary text-sm"
                  onClick={fetchAvailableModels}
                  disabled={isLoadingModels}
                >
                  🔄 Check Again
                </button>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <strong className="text-sm text-gray-700">Selected CV:</strong>
                <span className="text-sm text-gray-600">{selectedCV ? selectedCV.filename : 'None selected'}</span>
              </div>
              <div className="flex justify-between items-center">
                <strong className="text-sm text-gray-700">Selected JD:</strong>
                <span className="text-sm text-gray-600">{selectedJD ? (selectedJD.title || `JD ${selectedJD.id.slice(0, 8)}...`) : 'None selected'}</span>
              </div>
              <div className="flex justify-between items-center">
                <strong className="text-sm text-gray-700">AI Model:</strong>
                <span className="text-sm text-gray-600">{availableModels.find(m => m.id === selectedModel)?.name}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              className={`btn-primary w-full ${!selectedCV || !selectedJD || !selectedModel || isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleAnalyze}
              disabled={!selectedCV || !selectedJD || !selectedModel || isAnalyzing}
            >
              {isAnalyzing ? '⏳ Analyzing...' : '🚀 Start Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Row */}
      {results && (
        <div className="mt-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <span>📊</span>
                <span>Analysis Results</span>
              </h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center space-x-6">
                <div className="flex-shrink-0">
                  <div
                    className="w-20 h-20 rounded-full border-4 flex items-center justify-center"
                    style={{ borderColor: getScoreColor(results.score) }}
                  >
                    <span
                      className="text-2xl font-bold"
                      style={{ color: getScoreColor(results.score) }}
                    >
                      {results.score}%
                    </span>
                  </div>
                  <div className="text-center text-sm text-gray-600 mt-2">Match Score</div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <strong className="text-sm text-gray-700">Report ID:</strong>
                    <span className="text-sm text-gray-600">{results.reportId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <strong className="text-sm text-gray-700">Model Used:</strong>
                    <span className="text-sm text-gray-600">{results.model}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <strong className="text-sm text-gray-700">Analysis Time:</strong>
                    <span className="text-sm text-gray-600">{new Date(results.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {results.analysis && (
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-900">Detailed Analysis:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none">
                    {cleanAnalysisContent(results.analysis)}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  className="btn-primary"
                  onClick={() => window.open(`/reports/${results.reportId}`, '_blank')}
                >
                  📈 View Full Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisManager;

AnalysisManager.propTypes = {
  cvs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      filename: PropTypes.string,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      preview: PropTypes.string,
    })
  ).isRequired,
  jds: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      preview: PropTypes.string,
    })
  ).isRequired,
  onRefresh: PropTypes.func.isRequired,
};
