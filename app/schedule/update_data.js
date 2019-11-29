/* eslint-disable no-bitwise */
/* eslint-disable no-extend-native */
'use strict';

const Subscription = require('egg').Subscription;
const net = require('net');
const moment = require('moment');
const port = [ 25333, 4032 ];
const ip = [ '114.55.72.120', '61.50.135.114' ];
const userId = [ 1210, 1287 ];
const head = '##';
const ST = 'ST=39;';
const CN = 'CN=2011;';
const PW = 'PW=123456;';


class UpdateData extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '4m', // 4分钟间隔
      type: 'worker', // 随机指定一个woker执行一次
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {

    function getCrc16(data) {
      let crcReg = 0xffff;
      let check = 0;
      for (let i = 0, len = data.length; i < len; i++) {
        crcReg = (crcReg >> 8) ^ data[i];
        for (let j = 0; j < 8; j++) {
          check = crcReg & 0x0001;
          crcReg >>= 1;
          if (check === 0x0001) {
            crcReg ^= 0xA001;
          }
        }
      }
      return crcReg;
    }

    for (let j = 0; j < userId.length; j++) {
      const deviceList = await this.ctx.curl(`http://115.28.187.9:7001/devicelist/${userId[j]}`, { dataType: 'json' });

      for (let i = 0; i < deviceList.data.length; i++) {
        const facId = deviceList.data[i].facId;
        let data = 'CP=&&DataTime=';
        try {
          const deviceInfo = await this.ctx.curl(`http://115.28.187.9:7001/device/${facId}`, { dataType: 'json' });
          const MN = `MN=${deviceInfo.data.Tel.trim()};`;
          const allElement = await this.ctx.curl(`http://115.28.187.9:7001/data/${facId}`, { dataType: 'json' });
          data += moment(new Date()).format('YYYYMMDDHHmmss');
          data += ';';

          const dataTime = new Date(allElement.data.dataTime).getTime();
          if ((new Date().getTime() - dataTime) <= (60 * 60 * 1000)) {
            let element = 'a01007-Rtd='; // 风速
            element += allElement.data.e1;
            element += ',';
            element += 'a01007-Flag=N;';
            data += element;

            element = 'a01008-Rtd='; // 风向
            element += allElement.data.e2;
            element += ',';
            element += 'a01008-Flag=N;';
            data += element;

            element = 'a01001-Rtd='; // 温度
            element += allElement.data.e3;
            element += ',';
            element += 'a01001-Flag=N;';
            data += element;

            element = 'a01002-Rtd='; // 湿度
            element += allElement.data.e4;
            element += ',';
            element += 'a01002-Flag=N;';
            data += element;

            element = 'Leq-Rtd='; // 噪声
            element += allElement.data.e5;
            element += ',';
            element += 'Leq-Flag=N;';
            data += element;

            element = 'a34004-Rtd='; // PM2.5
            element += allElement.data.e6;
            element += ',';
            element += 'a34004-Flag=N;';
            data += element;

            element = 'a34002-Rtd='; // PM10
            element += allElement.data.e7;
            element += ',';
            element += 'a34002-Flag=N&&';
            data += element;

            element = 'a01006-Rtd='; // 气压
            element += allElement.data.e10;
            element += ',';
            element += 'a01006-Flag=N&&';
            data += element;

            data = ST + CN + PW + MN + data;
            const packLen = ('0000' + data.length).substr(-4);

            const crc = getCrc16(Array.from(data).map(item => item.charCodeAt()));
            const crcStr = ('0000' + crc.toString(16)).substr(-4).toUpperCase();

            const message = head + packLen + data + crcStr + '\r\n';

            const client = new net.Socket();
            client.setEncoding('utf8');
            setTimeout(function() {
              client.connect(
                port[j],
                ip[j],
                function() {
                  console.log(`[${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}]-发送数据: ${message}`);
                  client.write(message);
                  client.on('data', function(data) {
                    console.log(`[${moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}]-接收数据: ${data.toString('hex')}`);
                  });
                  // 2秒后关闭与服务器的连接
                  setTimeout(function() {
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
}

module.exports = UpdateData;
