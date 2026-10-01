module.exports = {
  preset: 'react-native',
  // Transform ESM packages from react-native and react-navigation so Jest can parse them
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-navigation/native|@react-navigation/native-stack)/)'
  ],
};
