import React, { useState } from 'react';

const LoginSignupPage = ({ onLogin, isLoading = false, error = null }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    identifier: '', // username or email for login
    username: '', // only for signup
    email: '', // only for signup  
    password: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (isLogin) {
      // Login validation
      if (!formData.identifier.trim()) {
        errors.identifier = 'Username or email is required';
      }
      if (!formData.password) {
        errors.password = 'Password is required';
      }
    } else {
      // Signup validation
      if (!formData.username.trim()) {
        errors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters long';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.username = 'Username can only contain letters, numbers, and underscores';
      }

      if (!formData.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email';
      }

      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters long';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = isLogin 
      ? { identifier: formData.identifier, password: formData.password }
      : { username: formData.username, email: formData.email, password: formData.password };

    onLogin(submitData, isLogin);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      identifier: '',
      username: '',
      email: '',
      password: ''
    });
    setValidationErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-red-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🐦 Angry Birds Chess
          </h1>
          <p className="text-gray-300">
            {isLogin ? 'Welcome back, commander!' : 'Join the chess battlefield!'}
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? 'Login' : 'Create Account'}
            </h2>
            <p className="text-gray-300 text-sm">
              {isLogin 
                ? 'Enter your credentials to continue your chess adventure' 
                : 'Start your journey as a chess commander'
              }
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Login Fields */}
            {isLogin ? (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Username or Email
                </label>
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    validationErrors.identifier 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-white/20 focus:ring-blue-500'
                  }`}
                  placeholder="Enter username or email"
                  disabled={isLoading}
                />
                {validationErrors.identifier && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.identifier}</p>
                )}
              </div>
            ) : (
              // Signup Fields
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      validationErrors.username 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-white/20 focus:ring-blue-500'
                    }`}
                    placeholder="Choose a username"
                    disabled={isLoading}
                  />
                  {validationErrors.username && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      validationErrors.email 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-white/20 focus:ring-blue-500'
                    }`}
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                  {validationErrors.email && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
                  )}
                </div>
              </>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    validationErrors.password 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-white/20 focus:ring-blue-500'
                  }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.password}</p>
              )}
              {!isLogin && (
                <p className="text-gray-400 text-xs mt-1">Must be at least 6 characters long</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:hover:transform-none disabled:hover:shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Logging in...' : 'Creating account...'}
                </div>
              ) : (
                isLogin ? 'Login' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-300 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              type="button"
              onClick={toggleMode}
              disabled={isLoading}
              className="text-blue-400 hover:text-blue-300 font-medium text-sm mt-1 transition-colors disabled:opacity-50"
            >
              {isLogin ? 'Create one here' : 'Login here'}
            </button>
          </div>

          {/* Demo Note */}
          <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-100 text-xs text-center">
              🎮 All your game progress will be saved to the cloud and synced across devices!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSignupPage;
