'use strict';

const path = require('path');
const fs = require('fs/promises');

const express = require('express');
const expressSession = require('express-session');
const debug = require('debug')('Server');

const Util = require('./Util');
const ServerError = require('./ServerError');
const WireGuard = require('../services/WireGuard');

const { PORT, RELEASE, PASSWORD } = require('../config');

const multer = require('multer');

const uploadPath = path.resolve('./.wg-upload');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const pathToData = uploadPath;
    await fs.mkdir(pathToData, { recursive: true });
    cb(null, pathToData);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const Data = multer({
  storage,
});

module.exports = class Server {
  constructor() {
    // Express
    this.app = express()
      .disable('etag')
      .use('/', express.static(path.join(__dirname, '..', 'www')))
      .use(
        express.json({
          limit: '50MB',
        })
      )
      .use(
        expressSession({
          secret: String(Math.random()),
          resave: true,
          saveUninitialized: true,
        })
      )

      .get(
        '/api/release',
        Util.promisify(async () => {
          return RELEASE;
        })
      )

      // Authentication
      .get(
        '/api/session',
        Util.promisify(async (req) => {
          const requiresPassword = !!process.env.PASSWORD;
          const authenticated = requiresPassword
            ? !!(req.session && req.session.authenticated)
            : true;

          return {
            requiresPassword,
            authenticated,
          };
        })
      )
      .post(
        '/api/session',
        Util.promisify(async (req) => {
          const { password } = req.body;

          if (typeof password !== 'string') {
            throw new ServerError('Введите пароль', 401);
          }

          if (password !== PASSWORD) {
            throw new ServerError('Неверный пароль', 401);
          }

          req.session.authenticated = true;
          req.session.save();

          debug(`New Session: ${req.session.id}`);
        })
      )

      // WireGuard
      .use((req, res, next) => {
        if (!PASSWORD) {
          return next();
        }

        if (req.session && req.session.authenticated) {
          return next();
        }

        return res.status(401).json({
          error: 'Not Logged In',
        });
      })
      .delete(
        '/api/session',
        Util.promisify(async (req) => {
          const sessionId = req.session.id;

          req.session.destroy();

          debug(`Deleted Session: ${sessionId}`);
        })
      )
      .get(
        '/api/wireguard/client',
        Util.promisify(async (req) => {
          return WireGuard.getClients();
        })
      )
      .get(
        '/api/wireguard/client/:clientId/qrcode.svg',
        Util.promisify(async (req, res) => {
          const { clientId } = req.params;
          const svg = await WireGuard.getClientQRCodeSVG({ clientId });
          res.header('Content-Type', 'image/svg+xml');
          res.send(svg);
        })
      )
      .get(
        '/api/wireguard/client/:clientId/configuration',
        Util.promisify(async (req, res) => {
          const { clientId } = req.params;
          const client = await WireGuard.getClient({ clientId });
          const config = await WireGuard.getClientConfiguration({ clientId });
          const configName = client.name
            .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
            .replace(/(-{2,}|-$)/g, '-')
            .replace(/-$/, '')
            .substring(0, 32);
          res.header(
            'Content-Disposition',
            `attachment; filename="${configName || clientId}.conf"`
          );
          res.header('Content-Type', 'text/plain');
          res.send(config);
        })
      )
      .post(
        '/api/wireguard/client',
        Util.promisify(async (req) => {
          const { name } = req.body;
          return WireGuard.createClient({ name });
        })
      )
      .delete(
        '/api/wireguard/client/:clientId',
        Util.promisify(async (req) => {
          const { clientId } = req.params;
          return WireGuard.deleteClient({ clientId });
        })
      )
      .post(
        '/api/wireguard/client/:clientId/enable',
        Util.promisify(async (req) => {
          const { clientId } = req.params;
          return WireGuard.enableClient({ clientId });
        })
      )
      .post(
        '/api/wireguard/client/:clientId/disable',
        Util.promisify(async (req) => {
          const { clientId } = req.params;
          return WireGuard.disableClient({ clientId });
        })
      )
      .put(
        '/api/wireguard/client/:clientId/name',
        Util.promisify(async (req) => {
          const { clientId } = req.params;
          const { name } = req.body;
          return WireGuard.updateClientName({ clientId, name });
        })
      )
      .put(
        '/api/wireguard/client/:clientId/address',
        Util.promisify(async (req) => {
          const { clientId } = req.params;
          const { address } = req.body;
          return WireGuard.updateClientAddress({ clientId, address });
        })
      );

    const pathToConfig = path.resolve('/etc/wireguard');

    this.app
      .post('/api/backup/upload', Data.any('file'), async (req, res) => {
        // console.log(req.files);

        try {
          // await fs.mkdir(pathToConfig, { recursive: true });
          // await fs.lstat(pathToConfig);

          // await fs.mkdir(uploadPath, {
          //   recursive: true,
          // });

          // console.log(req.files[0].path);

          const correctPath = path.resolve(req.files[0].path);

          // console.log(correctPath);

          const unzip = require('decompress');

          await unzip(correctPath, uploadPath);

          // List of new clients from archive
          const { clients } = JSON.parse(
            await fs.readFile(path.resolve(uploadPath, 'wg0.json'), 'utf-8')
          );

          // Show them
          // console.log('New clients:', clients);

          // Path to wg0.json into container
          const jsonConfigPath = path.resolve(pathToConfig, 'wg0.json');

          // return console.log(jsonConfigPath);

          // let config = JSON.parse(await fs.readFile(jsonConfigPath));
          let config = await WireGuard.getConfig();

          config.clients = { ...config.clients, ...clients };

          // console.log('We are from container files:', config.clients);

          await fs.writeFile(jsonConfigPath, JSON.stringify(config, null, 2));

          // return console.log(
          //   JSON.parse(await fs.readFile(jsonConfigPath, 'utf-8'))
          // );

          const confConfigPath = path.resolve(pathToConfig, 'wg0.conf');

          let confConfig = await fs.readFile(confConfigPath, 'utf-8');

          // return console.log(Object.entries(clients));

          const newClients = Object.entries(clients)
            .map(
              ([id, client]) => `
# Client: ${client.name} (${id})
[Peer]
PublicKey = ${client.publicKey}
PresharedKey = ${client.preSharedKey}
AllowedIPs = ${client.address}/32`
            )
            .join('\n');

          // console.log(newClients);

          confConfig += newClients;

          await fs.writeFile(confConfigPath, confConfig, 'utf-8');

          await WireGuard.__saveConfig(config);
          await WireGuard.__syncConfig();

          res.json({ ok: true });
        } catch (err) {
          console.log(err);
          res.json({ ok: false });
        }
      })

      .get('/api/check', async (req, res) => {
        const clients = await WireGuard.getClients();
        // return res.json(clients);
        const clientIds = clients.map((c) => c.id);
        const clientConfigurations = [];

        for (const clientId of clientIds) {
          clientConfigurations.push(
            await WireGuard.getClientConfiguration({ clientId })
          );
        }

        res.json(clientConfigurations);
      })

      .get('/api/backup/export', async (req, res) => {
        try {
          const exportPath = path.resolve('.', '.wg-export');

          await fs.mkdir(exportPath, { recursive: true });

          const pathToBackupFile = path.resolve(
            '.',
            '.wg-export',
            'export.zip'
          );

          await zipDirectory(pathToConfig, pathToBackupFile);

          res.sendFile(pathToBackupFile);
        } catch (err) {
          console.error(err);
          res.json({ error: err });
        }
        // const confConfigPath = path.resolve(pathToConfig, 'wg0.conf');

        // let confConfig = await fs.readFile(confConfigPath, 'utf-8');

        // const config = await WireGuard.getConfig();

        // res.json(config);

        // const glob = require('util').promisify(require('glob'));

        // const backupFiles = await glob(pathToConfig + '/wg0*');

        // console.log(backupFiles);
      })

      .listen(PORT, () => {
        debug(`Listening on http://0.0.0.0:${PORT}`);
      });
  }
};

const archiver = require('archiver');

/**
 * @param {String} sourceDir: /some/folder/to/compress
 * @param {String} outPath: /path/to/created.zip
 * @returns {Promise}
 */
function zipDirectory(sourceDir, outPath) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = require('fs').createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on('error', (err) => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
}
