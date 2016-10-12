import configFactory from 'madewithlove-webpack-config';
import HtmlWebpackPlugin from 'html-webpack-plugin';

var config = configFactory({
  sourcePath: 'app/src',
  angular: true
});

config.merge({
  devServer: {
    hot: true
  },

  plugins: [
    new HtmlWebpackPlugin({

      //inject: false,
      template: './app/index.ejs',
      filename: 'index.html',

      // Optional
      title: 'Goyastores',
      baseHref: '/',
      devServer: config.debug ? 'http://localhost:8080' : undefined,
      /*
      googleAnalytics: {
        trackingId: 'UA-XXXX-XX',
        pageViewOnLoad: true
      },
      */
      mobile: true,
      /*
      window: {
        env: {
          apiHost: 'http://myapi.com/api/v1'
        }
      }
      */
    })
  ]
});

export default config
