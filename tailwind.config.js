module.exports = {
  darkMode: ['class'], // Enables dark mode via 'class'
  theme: {
  	extend: {
  		colors: {
              background: '#111722',
            card: '#1E293B',
            fileExplorer: '#060B13',
  			slate: {
  				'50': '#f8fafc',
  				'100': '#f1f5f9',
  				'200': '#e2e8f0',
  				'300': '#cbd5e1',
  				'400': '#94a3b8',
  				'500': '#64748b',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1e293b',
  				'900': '#0f172a',
  				'950': '#020617'
  			},
  			'dark-slate': {
  				'50': '#f0f4f8',
  				'100': '#dbe3ea',
  				'200': '#b7c7d1',
  				'300': '#8ba2b1',
  				'400': '#677f8e',
  				'500': '#4b6474',
  				'600': '#384d59',
  				'700': '#2c3a42',
  				'800': '#1e2731',
  				'900': '#11171c',
  				'950': '#0a0e11'
  			},
  		},
  	}
  },
  plugins: [
    require('daisyui'),
  ],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  daisyui: {
    themes: [
      {
        light: {
          primary: '#64748b', // Slate 500
          secondary: '#94a3b8', // Slate 400
          accent: '#cbd5e1', // Slate 300
          neutral: '#e2e8f0', // Slate 200
          'base-100': '#f8fafc', // Slate 50
          info: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        },
        dark: {
          primary: '#4b6474', // Dark Slate 500
          secondary: '#8ba2b1', // Dark Slate 300
          accent: '#2c3a42', // Dark Slate 700
          neutral: '#11171c', // Dark Slate 900
          'base-100': '#1e2731', // Dark Slate 800
          info: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    ],
  },
};
