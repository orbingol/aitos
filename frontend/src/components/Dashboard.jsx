const Dashboard = ({ cvs, jds, reports, onViewChange }) => {
  const stats = [
    {
      title: 'Total CVs',
      value: cvs.length,
      icon: '📄',
      color: 'from-primary-500 to-primary-600',
      action: () => onViewChange('cvs')
    },
    {
      title: 'Job Descriptions',
      value: jds.length,
      icon: '💼',
      color: 'from-green-500 to-green-600',
      action: () => onViewChange('jds')
    },
    {
      title: 'Analysis Reports',
      value: reports.length,
      icon: '📈',
      color: 'from-red-500 to-red-600',
      action: () => onViewChange('reports')
    },
    {
      title: 'Success Rate',
      value: reports.length > 0 ? `${Math.round((reports.filter(r => r.score > 70).length / reports.length) * 100)}%` : '0%',
      icon: '✅',
      color: 'from-purple-500 to-purple-600',
      action: () => onViewChange('reports')
    }
  ];

  const recentReports = reports
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Dashboard
        </h1>
        <p className="text-lg text-gray-600">
          Welcome to AiToS - Analyze resumes against job descriptions with AI
        </p>
      </div>

      {/* Stats Grid - Mobile First */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="card cursor-pointer transform hover:scale-105 transition-transform duration-200 hover:shadow-soft-lg"
            onClick={stat.action}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center text-2xl sm:text-3xl shadow-lg`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid - Mobile First */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold text-gray-900">
              Quick Actions
            </h3>
          </div>
          <div className="space-y-3">
            <button
              className="w-full btn-primary text-left flex items-center space-x-3"
              onClick={() => onViewChange('analysis')}
            >
              <span className="text-xl">🔍</span>
              <span>New Analysis</span>
            </button>
            <button
              className="w-full btn-secondary text-left flex items-center space-x-3"
              onClick={() => onViewChange('cvs')}
            >
              <span className="text-xl">📄</span>
              <span>Upload CV</span>
            </button>
            <button
              className="w-full btn-secondary text-left flex items-center space-x-3"
              onClick={() => onViewChange('jds')}
            >
              <span className="text-xl">💼</span>
              <span>Create Job Description</span>
            </button>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Recent Reports
              </h3>
              <button
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                onClick={() => onViewChange('reports')}
              >
                View All →
              </button>
            </div>
          </div>
          {recentReports.length > 0 ? (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer border border-gray-200 hover:border-primary-200"
                  onClick={() => onViewChange('reports', report.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-mono text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          ID: {report.id.slice(0, 8)}...
                        </span>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.score > 70
                            ? 'bg-green-100 text-green-800'
                            : report.score > 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {report.score ? `${report.score}%` : 'N/A'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">📄 CV:</span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {report.cvFilename || 'Unknown CV'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">💼 JD:</span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {report.jdTitle || 'Unknown JD'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">🤖 Model:</span>
                          <span className="text-sm text-gray-700">
                            {report.model}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString()}
                    </p>
                    <span className="text-xs text-primary-600 font-medium">
                      View Report →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500">
                No reports yet. Run your first analysis!
              </p>
              <button
                className="btn-primary mt-4"
                onClick={() => onViewChange('analysis')}
              >
                Start Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
