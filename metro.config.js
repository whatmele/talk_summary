// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
console.log('Current assetExts:', config.resolver.assetExts);
console.log('Current config:', config);
// 确保 assetExts 包含自定义的文件扩展名
config.resolver.assetExts = [...config.resolver.assetExts, 'bin'];
console.log('modified config:', config);
module.exports = config;
