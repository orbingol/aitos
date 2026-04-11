import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { reportService } from '../services/api';
import { cleanAnalysisContent } from '../utils/textCleaner';

const ReportsManager = ({ reports, onRefresh, selectedReportId }) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState(null);
  const [showJsonReport, setShowJsonReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Get unique models for filter
  const uniqueModels = [...new Set(reports.map(r => r.model))];

  // Function to handle report selection and fetch details
  const handleReportSelect = useCallback(async (report) => {
    if (selectedReport?.id === report.id) return; // Already selected

    setSelectedReport(report);
    setSelectedReportDetails(null);
    setShowJsonReport(false);
    setLoading(true);

    try {
      const reportDetails = await reportService.getReport(report.id);
      setSelectedReportDetails(reportDetails);
    } catch (error) {
      console.error('Failed to fetch report details:', error);
      alert('Failed to load report details: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedReport?.id]);

  // Auto-select report if selectedReportId is provided
  useEffect(() => {
    if (selectedReportId && reports.length > 0) {
      const reportToSelect = reports.find(r => r.id === selectedReportId);
      if (reportToSelect) {
        handleReportSelect(reportToSelect);
      }
    }
  }, [selectedReportId, reports, handleReportSelect]);

  // Filter and sort reports
  const filteredAndSortedReports = reports
    .filter(report => {
      const matchesSearch = searchTerm === '' ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.cvFilename && report.cvFilename.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.jdTitle && report.jdTitle.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesModel = filterModel === '' || report.model === filterModel;
      return matchesSearch && matchesModel;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleReanalyze = async (reportId, model) => {
    try {
      await reportService.reanalyzeReport(reportId, model);
      onRefresh();
      // Refresh the selected report details
      if (selectedReport?.id === reportId) {
        const updatedReport = await reportService.getReport(reportId);
        setSelectedReportDetails(updatedReport);
      }
    } catch (error) {
      alert('Failed to reanalyze report: ' + error.message);
    }
  };

  const handleDelete = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      await reportService.deleteReport(reportId);
      onRefresh();
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
        setSelectedReportDetails(null);
      }
    } catch (error) {
      alert('Failed to delete report: ' + error.message);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Analysis Reports
        </h1>
        <p className="text-lg text-gray-600">
          View, manage, and reanalyze CV analysis reports
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="input-field"
            >
              <option value="">All Models</option>
              {uniqueModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div className="col-span-1 flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field flex-1"
            >
              <option value="createdAt">Date</option>
              <option value="score">Score</option>
              <option value="model">Model</option>
            </select>
            <button
              className="btn-secondary px-4"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>📊</span>
              <span>Reports ({filteredAndSortedReports.length})</span>
            </h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredAndSortedReports.map((report) => (
              <div
                key={report.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedReport?.id === report.id
                    ? 'bg-primary-50 border-primary-200 shadow-md'
                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
                onClick={() => handleReportSelect(report)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">
                      📊 {report.id.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {report.model}
                    </span>
                  </div>
                  <div
                    className="px-2 py-1 rounded text-sm font-semibold"
                    style={{
                      backgroundColor: getScoreColor(report.score) + '20',
                      color: getScoreColor(report.score)
                    }}
                  >
                    {report.score}%
                  </div>
                </div>

                {/* CV and JD Info */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">📄</span>
                    <span className="text-xs font-medium text-gray-700">CV:</span>
                    <span className="text-xs text-gray-600 truncate">
                      {report.cvFilename || 'Unknown CV'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">💼</span>
                    <span className="text-xs font-medium text-gray-700">JD:</span>
                    <span className="text-xs text-gray-600 truncate">
                      {report.jdTitle || 'Unknown JD'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                  <span
                    className="font-medium"
                    style={{ color: getScoreColor(report.score) }}
                  >
                    {getScoreLabel(report.score)}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="flex-1 btn-secondary text-xs py-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReanalyze(report.id, report.model);
                    }}
                    title="Reanalyze"
                  >
                    🔄 Reanalyze
                  </button>
                  <button
                    className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(report.id);
                    }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {filteredAndSortedReports.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
                <p className="text-gray-500">
                  {searchTerm || filterModel ? 'No reports match your filters' : 'No reports available yet'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 card">
          {selectedReport ? (
            loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="text-4xl mb-4">⏳</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Report Details...</h3>
                  <p className="text-gray-500">Fetching detailed analysis information</p>
                </div>
              </div>
            ) : selectedReportDetails ? (
              <div className="space-y-6">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Report Details</h3>
                    <div className="flex space-x-2">
                      <button
                        className={`px-3 py-1 text-sm rounded transition-colors duration-200 ${
                          showJsonReport
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => setShowJsonReport(!showJsonReport)}
                      >
                        {showJsonReport ? '📄 Human Report' : '🔧 JSON Report'}
                      </button>
                      <button
                        className="btn-secondary text-sm"
                        onClick={() => handleReanalyze(selectedReport.id, selectedReport.model)}
                      >
                        🔄 Reanalyze
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="flex items-center justify-center">
                    <div
                      className="w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center"
                      style={{ borderColor: getScoreColor(selectedReportDetails.jsonReport?.overall_score || 0) }}
                    >
                      <span
                        className="text-xl font-bold"
                        style={{ color: getScoreColor(selectedReportDetails.jsonReport?.overall_score || 0) }}
                      >
                        {selectedReportDetails.jsonReport?.overall_score || 0}%
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: getScoreColor(selectedReportDetails.jsonReport?.overall_score || 0) }}
                      >
                        {getScoreLabel(selectedReportDetails.jsonReport?.overall_score || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <strong className="text-sm text-gray-700">Report ID:</strong>
                      <span className="text-sm text-gray-600 font-mono">{selectedReport.id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <strong className="text-sm text-gray-700">AI Model:</strong>
                      <span className="text-sm text-gray-600">{selectedReport.model}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <strong className="text-sm text-gray-700">Resume ID:</strong>
                      <span className="text-sm text-gray-600 font-mono">{selectedReportDetails.resumeId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <strong className="text-sm text-gray-700">Job Description ID:</strong>
                      <span className="text-sm text-gray-600 font-mono">{selectedReportDetails.jobDescriptionId}</span>
                    </div>
                  </div>
                </div>

                {showJsonReport ? (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>🔧</span>
                      <span>JSON Analysis Data</span>
                    </h4>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      <pre className="p-4 text-sm overflow-auto max-h-96 text-gray-800">
                        {JSON.stringify(selectedReportDetails.jsonReport, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>📄</span>
                      <span>Analysis Report</span>
                    </h4>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      {selectedReportDetails.humanReport ? (
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                          {cleanAnalysisContent(selectedReportDetails.humanReport)}
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-center">
                          ⚠️ No human-readable report available for this analysis.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedReportDetails.resume && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>📄</span>
                      <span>Resume Content</span>
                    </h4>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-72 overflow-y-auto">
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedReportDetails.resume.content || 'No content available'}
                      </div>
                    </div>
                  </div>
                )}

                {selectedReportDetails.jobDescription && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>💼</span>
                      <span>Job Description</span>
                    </h4>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-72 overflow-y-auto">
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        <strong className="block mb-2">{selectedReportDetails.jobDescription.title}</strong>
                        {selectedReportDetails.jobDescription.content || 'No content available'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="text-4xl mb-4">❌</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Report</h3>
                  <p className="text-gray-500">Could not fetch detailed report information</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Report</h3>
                <p className="text-gray-500">Choose a report from the list to view detailed analysis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsManager;

ReportsManager.propTypes = {
  reports: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      score: PropTypes.number,
      model: PropTypes.string.isRequired,
      cvFilename: PropTypes.string,
      jdTitle: PropTypes.string,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    })
  ).isRequired,
  onRefresh: PropTypes.func.isRequired,
  selectedReportId: PropTypes.string,
};
