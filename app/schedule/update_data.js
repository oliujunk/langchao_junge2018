/* eslint-disable no-bitwise */
/* eslint-disable no-extend-native */
'use strict';

const Subscription = require('egg').Subscription;
const net = require('net');
const port = 8888;
const ip = '119.164.253.229';
const userId = 1045;
const token = '52376242'; // token
const sbbh = '20190610'; // ID号前缀


class UpdateData extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '5m', // 1 分钟间隔
      type: 'worker', // 指定所有的 worker 都需要执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    Date.prototype.Format = function(fmt) {
      // author: meizz
      const o = {
        'M+': this.getMonth() + 1,
        'd+': this.getDate(),
        'H+': this.getHours(),
        'm+': this.getMinutes(),
        's+': this.getSeconds(),
        'q+': Math.floor((this.getMonth() + 3) / 3),
        S: this.getMilliseconds(),
      };
      const year = this.getFullYear();
      let yearstr = year + '';
      yearstr =
        yearstr.length >= 4
          ? yearstr
          : '0000'.substr(0, 4 - yearstr.length) + yearstr;

      if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          (yearstr + '').substr(4 - RegExp.$1.length)
        );
      }
      for (const k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
          fmt = fmt.replace(
            RegExp.$1,
            RegExp.$1.length === 1
              ? o[k]
              : ('00' + o[k]).substr(('' + o[k]).length)
          );
        }
      }
      return fmt;
    };

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

    const res = await this.ctx.curl(`http://115.28.187.9:7001/devicelist/${userId}`, {
      dataType: 'json',
    });

    for (let i = 0; i < res.data.length; i++) {
      const facId = res.data[i].facId;
      const head = '8888';
      const xxbm = getRadomNum(8);
      const sjlx = '00';
      const bysj = '0000000000000000';
      const end = '0304';
      let data = '000000';
      try {
        const dataObj = await this.ctx.curl(
          `http://115.28.187.9:7001/data/${facId}`,
          {
            dataType: 'json',
          }
        );
        const dataTime = new Date(dataObj.data.dataTime).getTime();
        if ((new Date().getTime() - dataTime) <= (60 * 60 * 1000)) {
          let element = '0000';
          let value = parseFloat(dataObj.data.e6) * 10;
          let value1 = 0;
          if (value >= 327670 || value < 0) value1 = 0;
          else value1 = value;
          element += (value1 < 6000 ? value1 : 400).toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e7) * 10;
          value1 = 0;
          if (value >= 327670 || value < 0) value1 = 0;
          else value1 = value;
          element += (value1 < 6000 ? value1 : 900).toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e5) * 10;
          value1 = 0;
          if (value >= 327670 || value < 0) value1 = 0;
          else value1 = value;
          element += value1.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e2) * 10;
          value1 = 0;
          if (value >= 327670 || value < 0) value1 = 0;
          else value1 = value;
          element += value1.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e1) * 10;
          value1 = 0;
          if (value >= 327670 || value < 0) value1 = 0;
          else value1 = value;
          element += value1.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = Math.abs(parseFloat(dataObj.data.e3)) * 10;
          value1 = 0;
          if (value >= 327670 || value < 0) value1 = 0;
          else value1 = value;
          element += value1.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          element = '0000';
          value = parseFloat(dataObj.data.e4) * 10;
          value1 = 0;
          if (value >= 327670 || value < 0) value1 = 0;
          else value1 = value;
          element += value1.toString(16);
          element = element.substring(element.length - 4);
          data += element;

          data += '0000000000000000';

          const timestamp = Date.parse(new Date());
          data += new Date(timestamp - 5 * 60 * 1000).Format('yyyyMMddHHmm');
          data += new Date().Format('yyyyMMddHHmm');
          data += new Date().Format('yyyyMMddHHmm');

          const temp = head + xxbm + sbbh + facId + token + sjlx + data + bysj;

          const dataBytes = stringToByte(temp);
          const xorResult = getXor(dataBytes);
          const message = temp + xorResult.toString(16) + end;

          const client = new net.Socket();
          client.setEncoding('utf8');
          setTimeout(function() {
            client.connect(
              port,
              ip,
              function() {
                console.log(
                  `[${new Date()}]发送数据[${message.toUpperCase()}]`
                );
                const buffer = Buffer.from(stringToByte(message));
                client.write(buffer);
                client.on('data', function(data) {
                  console.log(`接收数据[${data.toString('hex')}]`);
                });
                // 指定10秒后关闭与服务器的连接
                setTimeout(function() {
                  // 客户端的socket端口对象可以调用end方法来结束与服务端的连接，同时服务端添加end事件的监听事件即可。
                  console.log('断开连接');
                  client.destroy();
                }, 2000);
              }
            );
          }, (i / 2) * 1000);
        }
      } catch (err) {
        console.log(`[${facId}]获取数据失败`);
      }
    }
  }
}

module.exports = UpdateData;
