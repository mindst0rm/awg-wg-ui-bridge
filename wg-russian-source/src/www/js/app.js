/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
/* eslint-disable no-new */

'use strict';

function bytes(bytes, decimals, kib, maxunit) {
  kib = kib || false;
  if (bytes === 0) return '0 B';
  if (Number.isNaN(parseFloat(bytes)) && !Number.isFinite(bytes)) return 'NaN';
  const k = kib ? 1024 : 1000;
  const dm =
    decimals != null && !Number.isNaN(decimals) && decimals >= 0 ? decimals : 2;
  const sizes = kib
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB', 'BiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  if (maxunit !== undefined) {
    const index = sizes.indexOf(maxunit);
    if (index !== -1) i = index;
  }
  // eslint-disable-next-line no-restricted-properties
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

new Vue({
  el: '#app',
  data: {
    authenticated: null,
    authenticating: false,
    password: null,
    requiresPassword: null,

    clients: null,
    clientsPersist: {},
    clientDelete: null,
    clientCreate: null,
    clientCreateName: '',
    clientEditName: null,
    clientEditNameId: null,
    clientEditAddress: null,
    clientEditAddressId: null,
    qrcode: null,

    currentRelease: null,
    latestRelease: null,

    chartOptions: {
      chart: {
        background: 'transparent',
        type: 'bar',
        stacked: false,
        toolbar: {
          show: false,
        },
        animations: {
          enabled: false,
        },
      },
      colors: [
        '#DDDDDD', // rx
        '#EEEEEE', // tx
      ],
      dataLabels: {
        enabled: false,
      },
      plotOptions: {
        bar: {
          horizontal: false,
        },
      },
      xaxis: {
        labels: {
          show: false,
        },
        axisTicks: {
          show: true,
        },
        axisBorder: {
          show: true,
        },
      },
      yaxis: {
        labels: {
          show: false,
        },
        min: 0,
      },
      tooltip: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      grid: {
        show: false,
        padding: {
          left: -10,
          right: 0,
          bottom: -15,
          top: -15,
        },
        column: {
          opacity: 0,
        },
        xaxis: {
          lines: {
            show: false,
          },
        },
      },
    },
  },
  methods: {
    dateTime: (value) => {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(value);
    },
    async refresh({ updateCharts = false } = {}) {
      if (!this.authenticated) return;

      const clients = await this.api.getClients();
      this.clients = clients.map((client) => {
        if (client.name.includes('@') && client.name.includes('.')) {
          client.avatar = `https://www.gravatar.com/avatar/${md5(
            client.name
          )}?d=blank`;
        }

        if (!this.clientsPersist[client.id]) {
          this.clientsPersist[client.id] = {};
          this.clientsPersist[client.id].transferRxHistory = Array(50).fill(0);
          this.clientsPersist[client.id].transferRxPrevious = client.transferRx;
          this.clientsPersist[client.id].transferTxHistory = Array(50).fill(0);
          this.clientsPersist[client.id].transferTxPrevious = client.transferTx;
        }

        // Debug
        // client.transferRx = this.clientsPersist[client.id].transferRxPrevious + Math.random() * 1000;
        // client.transferTx = this.clientsPersist[client.id].transferTxPrevious + Math.random() * 1000;

        if (updateCharts) {
          this.clientsPersist[client.id].transferRxCurrent =
            client.transferRx -
            this.clientsPersist[client.id].transferRxPrevious;
          this.clientsPersist[client.id].transferRxPrevious = client.transferRx;
          this.clientsPersist[client.id].transferTxCurrent =
            client.transferTx -
            this.clientsPersist[client.id].transferTxPrevious;
          this.clientsPersist[client.id].transferTxPrevious = client.transferTx;

          this.clientsPersist[client.id].transferRxHistory.push(
            this.clientsPersist[client.id].transferRxCurrent
          );
          this.clientsPersist[client.id].transferRxHistory.shift();

          this.clientsPersist[client.id].transferTxHistory.push(
            this.clientsPersist[client.id].transferTxCurrent
          );
          this.clientsPersist[client.id].transferTxHistory.shift();
        }

        client.transferTxCurrent =
          this.clientsPersist[client.id].transferTxCurrent;
        client.transferRxCurrent =
          this.clientsPersist[client.id].transferRxCurrent;

        client.transferTxHistory =
          this.clientsPersist[client.id].transferTxHistory;
        client.transferRxHistory =
          this.clientsPersist[client.id].transferRxHistory;
        client.transferMax = Math.max(
          ...client.transferTxHistory,
          ...client.transferRxHistory
        );

        client.hoverTx = this.clientsPersist[client.id].hoverTx;
        client.hoverRx = this.clientsPersist[client.id].hoverRx;

        return client;
      });
    },
    login(e) {
      e.preventDefault();

      if (!this.password) return;
      if (this.authenticating) return;

      this.authenticating = true;
      this.api
        .createSession({
          password: this.password,
        })
        .then(async () => {
          const session = await this.api.getSession();
          this.authenticated = session.authenticated;
          this.requiresPassword = session.requiresPassword;
          return this.refresh();
        })
        .catch((err) => {
          alert(err.message || err.toString());
        })
        .finally(() => {
          this.authenticating = false;
          this.password = null;
        });
    },
    logout(e) {
      e.preventDefault();

      this.api
        .deleteSession()
        .then(() => {
          this.authenticated = false;
          this.clients = null;
        })
        .catch((err) => {
          alert(err.message || err.toString());
        });
    },
    createClient() {
      const name = this.clientCreateName;
      if (!name) return;

      this.api
        .createClient({ name })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    deleteClient(client) {
      this.api
        .deleteClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    enableClient(client) {
      this.api
        .enableClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    disableClient(client) {
      this.api
        .disableClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updateClientName(client, name) {
      this.api
        .updateClientName({ clientId: client.id, name })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },
    updateClientAddress(client, address) {
      this.api
        .updateClientAddress({ clientId: client.id, address })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },

    // downloadBackup() {
    //   console.log(document.querySelectorAll('a[download]'));
    //   document.querySelectorAll('a[download]').forEach((a) => a.click());
    // },

    downloadBackup() {
      const a = document.createElement('a');
      a.download = 'export.zip';
      a.href = '/api/backup/export';
      a.click();
    },

    async onUploadBackup(event) {
      const importFile = event.target;
      // e.preventDefault();

      // console.log(importFile.files);

      const files = Array.from(importFile.files);

      const allowedExt = [
        'application/zip',
        'application/octet-stream',
        'application/x-zip-compressed',
        'multipart/x-zip',
      ];

      // return console.log(files[0].type);

      if (!files.some((f) => allowedExt.includes(f.type))) {
        // console.log(importFile.value);
        importBackupForm.reset();
        alert('Выберите ZIP-архив!');
        return;
      }

      // console.log(importFile.files[0]);

      // for (const file of files) {
      //   data.append("files", file);
      // }

      // const data = new FormData(importBackupForm);
      const data = new FormData();

      // console.log(e.target.files[0]);
      data.append('file', importFile.files[0]);

      // return console.log(data.get("file"));

      const response = await this.api.uploadBackup(data);

      // console.log(response);

      importBackupForm.reset();

      if (response.ok) {
        // console.log(await this.api.getClients());
        this.refresh();
      }
    },

    uploadBackup() {
      // const importBackupForm = document.getElementById('importBackupForm');
      const importFile = document.getElementById('importBackupFile');

      importFile.click();

      // importFile.addEventListener('change', async (e) => {
      //   // e.preventDefault();

      //   // console.log(importFile.files);

      //   const files = Array.from(importFile.files);

      //   const allowedExt = [
      //     'application/zip',
      //     'application/octet-stream',
      //     'application/x-zip-compressed',
      //     'multipart/x-zip',
      //   ];

      //   // return console.log(files[0].type);

      //   if (!files.some((f) => allowedExt.includes(f.type))) {
      //     // console.log(importFile.value);
      //     importBackupForm.reset();
      //     alert('Выберите ZIP-архив!');
      //     return;
      //   }

      //   // console.log(importFile.files[0]);

      //   // for (const file of files) {
      //   //   data.append("files", file);
      //   // }

      //   // const data = new FormData(importBackupForm);
      //   const data = new FormData();

      //   // console.log(e.target.files[0]);
      //   data.append('file', e.target.files[0]);

      //   // return console.log(data.get("file"));

      //   const response = await this.api.uploadBackup(data);

      //   // console.log(response);

      //   if (response.ok) {
      //     // console.log(await this.api.getClients());
      //     await this.refresh();
      //   }
      // });

      // importBackupForm.addEventListener("submit", (e) => {
      //   e.preventDefault();

      //   // this.api.uploadBackup(data);
      // });
    },
  },
  filters: {
    bytes,
    timeago: (value) => {
      return timeago().format(value);
    },
  },
  mounted() {
    this.api = new API();
    this.api
      .getSession()
      .then((session) => {
        this.authenticated = session.authenticated;
        this.requiresPassword = session.requiresPassword;
        this.refresh({
          updateCharts: true,
        }).catch((err) => {
          alert(err.message || err.toString());
        });
      })
      .catch((err) => {
        alert(err.message || err.toString());
      });

    setInterval(() => {
      this.refresh({
        updateCharts: true,
      }).catch(console.error);
    }, 1000);
  },
});
