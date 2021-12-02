const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const fs = require('fs');

// App directory
const appDirectory = fs.realpathSync(process.cwd());
 
module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        static: path.resolve(appDirectory, "public"),
        compress: false,
        hot: true,
        // publicPath: '/',
        open: true,
        port: 2480,
        allowedHosts: 'all',
        host: '10.29.5.204', // enable to access from other devices on the network
        server: {
            type: 'https',  
            options: {
//               ca: './path/to/server.pem',
//                pfx: './path/to/server.pfx',
//                key: './path/to/server.key',
//                cert: './path/to/server.crt',
//                passphrase: 'webpack-dev-server',
//                requestCert: true,
              },
        }  
    },
});