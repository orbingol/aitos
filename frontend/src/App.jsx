import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import CVManager from './components/CVManager';
import JDManager from './components/JDManager';
import AnalysisManager from './components/AnalysisManager';
import ReportsManager from './components/ReportsManager';
import ModelManager from './components/ModelManager';
import { cvService, jdService, reportService } from './services/api';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [cvs, setCVs] = useState([]);
  const [jds, setJDs] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cvsData, jdsData, reportsData] = await Promise.all([
        cvService.listCVs(),
        jdService.listJDs(),
        reportService.listReports(),
      ]);
      setCVs(cvsData);
      setJDs(jdsData);
      setReports(reportsData);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (view, reportId = null) => {
    setCurrentView(view);
    setSelectedReportId(reportId);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            cvs={cvs}
            jds={jds}
            reports={reports}
            onViewChange={handleViewChange}
          />
        );
      case 'cvs':
        return (
          <CVManager
            cvs={cvs}
            onRefresh={loadData}
          />
        );
      case 'jds':
        return (
          <JDManager
            jds={jds}
            onRefresh={loadData}
          />
        );
      case 'analysis':
        return (
          <AnalysisManager
            cvs={cvs}
            jds={jds}
            onRefresh={loadData}
          />
        );
      case 'reports':
        return (
          <ReportsManager
            reports={reports}
            onRefresh={loadData}
            selectedReportId={selectedReportId}
          />
        );
      case 'models':
        return <ModelManager />;
      default:
        return (
          <Dashboard
            cvs={cvs}
            jds={jds}
            reports={reports}
            onViewChange={handleViewChange}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentView={currentView}
        onViewChange={handleViewChange}
      />

      {error && (
        <div className="error-message mx-4 mt-4">
          <span>⚠️ {error}</span>
          <button
            onClick={loadData}
            className="btn-secondary ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="loading-spinner mr-2"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      )}

      <main className="container-custom py-6">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
