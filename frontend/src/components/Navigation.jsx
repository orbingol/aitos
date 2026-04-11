import { useState } from 'react';

const Navigation = ({ currentView, onViewChange }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'cvs', label: 'CVs', icon: '📄' },
    { id: 'jds', label: 'Job Descriptions', icon: '💼' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'models', label: 'AI Models', icon: '🤖' },
    { id: 'analysis', label: 'New Analysis', icon: '🔍', special: true },
  ];

  return (
    <nav className="bg-navy-800 shadow-soft-lg sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center">
            <h2 className="text-2xl font-bold text-white">
              AiToS
            </h2>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-navy-800 transition-colors duration-200"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 inline-flex items-center space-x-2 ${
                    currentView === item.id
                      ? 'bg-primary-600 text-white'
                      : item.special
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'text-gray-300 hover:bg-navy-700 hover:text-white'
                  }`}
                  onClick={() => onViewChange(item.id)}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-navy-700">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${
                  currentView === item.id
                    ? 'bg-primary-600 text-white'
                    : item.special
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'text-gray-300 hover:bg-navy-700 hover:text-white'
                }`}
                onClick={() => {
                  onViewChange(item.id);
                  setIsMenuOpen(false);
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
