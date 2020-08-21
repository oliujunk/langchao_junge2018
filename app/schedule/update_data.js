'use strict';

const Subscription = require('egg').Subscription;
const moment = require('moment');
const username = 'junge2018';
const token = '59446439';

class UpdateData extends Subscription {
  static get schedule() {
    return {
      interval: '5m', // 1 分钟间隔
      type: 'worker', // 指定所有的 worker 都需要执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    function getRadomNum(capacity) {
      const chars = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ];
      let res = '';
      for (let i = 0; i < capacity; i++) {
        const id = Math.ceil(Math.random() * (chars.length - 1));
        res += chars[id];
      }
      return res;
    }

    function stringToByte(str) {
      const bytes = new Array(0);

      for (let i = 0; i < str.length; i += 2) {
        bytes.push(parseInt(str.substring(i, i + 2), 16));
      }
      return bytes;
    }

    function getXor(datas) {
      let bytes = datas[0];
      for (let i = 1; i < datas.length; i++) {
        bytes ^= datas[i];
      }
      return bytes;
    }

    const res = await this.ctx.curl(`http://115.28.187.9:8005/user/${username}`, {
      dataType: 'json',
      headers: {
        token: this.ctx.app.token,
      },
    });

    for (let i = 0; i < res.data.devices.length; i++) {
      const facId = res.data.devices[i].facId;
      const head = '8888';
      const xxbm = getRadomNum(8);
      const sbbh = '00000000';
      const sjlx = '00';
      const bysj = '0000000000000000';
      const end = '0304';
      let data = '000000';
      try {
        const dataObj = await this.ctx.curl(`http://115.28.187.9:8005/data/${facId}`, {
          dataType: 'json',
          headers: {
            token: this.ctx.app.token,
          },
        });
        const dataTime = new Date(dataObj.data.dataTime).getTime();
        if ((new Date().getTime() - dataTime) <= (60 * 60 * 1000)) {
          let element = '0000';
          let value = parseFloat(dataObj.data.e6) * 10;
          if (value >= 327670 || value < 0) value = 0;
          else if (value > 6000) value = 400;
          // else if (value < parseFloat(standard.data.val1) * 10 * 0.875) {
          //   value = parseFloat(standard.data.val1) * 10;
          // }
          value = value - 50 + Math.ceil(Math.random() * 100);
          element += value.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e7) * 10;
          if (value >= 327670 || value < 0) value = 0;
          else if (value > 6000) value = 900;
          // else if (value < parseFloat(standard.data.val2) * 10 * 0.875) {
          //   value = parseFloat(standard.data.val2) * 10;
          // }
          value = value - 50 + Math.ceil(Math.random() * 100);
          element += value.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e5);
          if (value >= 32767 || value < 0) value = 0;
          element += value.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e2) * 10;
          if (value >= 327670 || value < 0) value = 0;
          element += value.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e1);
          if (value >= 32767 || value < 0) value = 0;
          element += value.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e3);
          if (value >= 32767 || value === -395) value = 0;
          else if (value < 0) value = Math.abs(value) + 0x8000;
          element += value.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e4);
          if (value >= 32767 || value < 0) value = 0;
          element += value.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          data += '0000000000000000';

          const timestamp = Date.parse(new Date());
          data += moment(new Date(timestamp - 5 * 60 * 1000)).format('YYYYMMDDHHmm');
          data += moment().format('YYYYMMDDHHmm');
          data += moment().format('YYYYMMDDHHmm');

          const temp = head + xxbm + sbbh + facId + token + sjlx + data + bysj;

          const dataBytes = stringToByte(temp);
          const xorResult = getXor(dataBytes);
          const xorStr = ('00' + xorResult.toString(16)).slice(-2);
          const message = temp + xorStr + end;

          const buffer = Buffer.from(stringToByte(message));
          setTimeout(() => {
            const client = this.ctx.app.client[(Math.ceil(Math.random() * 100)) % 5];
            if (client.writable) {
              console.log(`[${facId}][${moment().format('YYYY-MM-DD HH:mm:ss')}]发送数据[${message.toUpperCase()}]`);
              client.write(buffer);
            } else {
              console.log(`[${facId}][${moment().format('YYYY-MM-DD HH:mm:ss')}]连接不可用`);
            }
          }, (i / 2) * 500);
        }
      } catch (err) {
        console.log(`[${facId}]获取数据失败`);
      }
    }
  }
}

module.exports = UpdateData;
