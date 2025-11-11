const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.ts',
    popup: './src/popup/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public/manifest.json', to: 'manifest.json' },
        { from: 'public/icons', to: 'icons', noErrorOnMissing: true },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/content/content.css', to: 'content.css', noErrorOnMissing: true },
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
};
