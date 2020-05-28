/* eslint-disable no-bitwise */
/* eslint-disable no-extend-native */
'use strict';

const Subscription = require('egg').Subscription;
const net = require('net');
const moment = require('moment');
const port = [ 7102 ];
const ip = [ '111.53.98.26' ];
const userId = [ 'changzhi' ];
const client = new Array(20);
const head = '##';
const ST = 'ST=22;';
const CN = 'CN=2011;';
let MN = '';
let PW = '';

const isEmpty = obj => {
  if (typeof obj === 'undefined' || obj == null || obj === '') {
    return true;
  }
  return false;
};

class UpdateData extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '5m', // 分钟间隔
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
      const deviceList = await this.ctx.curl(`http://115.28.187.9:8005/user/${userId[j]}`, {
        dataType: 'json',
        headers: {
          token: this.ctx.app.token,
        },
      });

      for (let i = 0; i < deviceList.data.devices.length; i++) {
        const facId = deviceList.data.devices[i].facId;
        let data = 'CP=&&DataTime=';
        try {
          const temp = deviceList.data.devices[i].remark.split('&');
          MN = `MN=${temp[0]};`;
          PW = `PW=${temp[1]};`;
          const allElement = await this.ctx.curl(`http://115.28.187.9:8005/data/${facId}`, {
            dataType: 'json',
            headers: {
              token: this.ctx.app.token,
            },
          });
          data += moment(new Date()).format('YYYYMMDDHHmmss');
          data += ';';

          const dataTime = new Date(allElement.data.dataTime).getTime();
          if ((new Date().getTime() - dataTime) <= (5 * 60 * 60 * 1000)) {
            let element = 'a01007-Rtd='; // 风速
            element += allElement.data.e1 / 10;
            element += ',';
            element += 'a01007-Flag=N;';
            data += element;

            element = 'a01008-Rtd='; // 风向
            element += allElement.data.e2;
            element += ',';
            element += 'a01008-Flag=N;';
            data += element;

            element = 'a01001-Rtd='; // 温度
            element += allElement.data.e3 / 10;
            element += ',';
            element += 'a01001-Flag=N;';
            data += element;

            element = 'a01002-Rtd='; // 湿度
            element += allElement.data.e4 / 10;
            element += ',';
            element += 'a01002-Flag=N;';
            data += element;

            if (j >= 2) {
              element = 'LA-Rtd='; // 噪声
              element += allElement.data.e5 / 10;
              element += ',';
              element += 'LA-Flag=N;';
            } else {
              element = 'Leq-Rtd='; // 噪声
              element += allElement.data.e5 / 10;
              element += ',';
              element += 'Leq-Flag=N;';
            }
            data += element;

            element = 'a34004-Rtd='; // PM2.5
            element += allElement.data.e6 * 1000;
            element += ',';
            element += 'a34004-Flag=N;';
            data += element;

            element = 'a34002-Rtd='; // PM10
            element += allElement.data.e7 * 1000;
            element += ',';
            element += 'a34002-Flag=N;';
            data += element;

            element = 'a01006-Rtd='; // 气压
            element += allElement.data.e10 / 100;
            element += ',';
            element += 'a01006-Flag=N&&';
            data += element;

            const QN = `QN=${moment(new Date()).format('YYYYMMDDHHmmssSSS')};`;

            data = QN + ST + CN + PW + MN + data;
            const packLen = ('0000' + data.length).substr(-4);

            const crc = getCrc16(Array.from(data).map(item => item.charCodeAt()));
            const crcStr = ('0000' + crc.toString(16)).substr(-4).toUpperCase();

            const message = head + packLen + data + crcStr + '\r\n';

            if (isEmpty(client[i])) {
              const socket = new net.Socket();
              socket.connect(port[j], ip[j], () => {
                console.log('已连接');
              });
              socket.on('data', data => {
                const recvMessage = data.toString('ascii');
                console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}]-接收数据: ${recvMessage}`);
                try {
                  const field = recvMessage.split(';');
                  const QNData = field[0].substr(-17);
                  if (field.some(item => item === 'CN=1011')) {
                    let ans1 = `QN=${QNData};`;
                    ans1 += 'ST=91;';
                    ans1 += 'CN=9011;';
                    ans1 += `MN=${temp[0]};`;
                    ans1 += `PW=${temp[1]};`;
                    ans1 += 'Flag=4;';
                    ans1 += 'CP=&&QnRtn=1&&';
                    const packLen = ('0000' + ans1.length).substr(-4);

                    const crc = getCrc16(Array.from(ans1).map(item => item.charCodeAt()));
                    const crcStr = ('0000' + crc.toString(16)).substr(-4).toUpperCase();

                    const message = head + packLen + ans1 + crcStr + '\r\n';
                    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}]-发送数据: ${message}`);
                    socket.write(message);
                    setTimeout(() => {
                      let ans2 = `QN=${QNData};`;
                      ans2 += 'ST=22;';
                      ans2 += 'CN=1011;';
                      ans2 += `MN=${temp[0]};`;
                      ans2 += `PW=${temp[1]};`;
                      ans2 += 'Flag=4;';
                      ans2 += `CP=&&SystemTime=${moment().format('YYYYMMDDHHmmss')}&&`;
                      const packLen = ('0000' + ans2.length).substr(-4);

                      const crc = getCrc16(Array.from(ans2).map(item => item.charCodeAt()));
                      const crcStr = ('0000' + crc.toString(16)).substr(-4).toUpperCase();

                      const message = head + packLen + ans2 + crcStr + '\r\n';
                      console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}]-发送数据: ${message}`);
                      socket.write(message);
                    }, 100);
                    setTimeout(() => {
                      let ans3 = `QN=${QNData};`;
                      ans3 += 'ST=91;';
                      ans3 += 'CN=9012;';
                      ans3 += `MN=${temp[0]};`;
                      ans3 += `PW=${temp[1]};`;
                      ans3 += 'Flag=4;';
                      ans3 += 'CP=&&ExeRtn=1&&';
                      const packLen = ('0000' + ans3.length).substr(-4);

                      const crc = getCrc16(Array.from(ans3).map(item => item.charCodeAt()));
                      const crcStr = ('0000' + crc.toString(16)).substr(-4).toUpperCase();

                      const message = head + packLen + ans3 + crcStr + '\r\n';
                      console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}]-发送数据: ${message}`);
                      socket.write(message);
                    }, 200);
                  } else if (field.some(item => item === 'CN=1100')) {
                    let ans3 = `QN=${QNData};`;
                    ans3 += 'ST=91;';
                    ans3 += 'CN=9011;';
                    ans3 += `MN=${temp[0]};`;
                    ans3 += `PW=${temp[1]};`;
                    ans3 += 'Flag=4;';
                    ans3 += 'CP=&&QnRtn=1&&';
                    const packLen = ('0000' + ans3.length).substr(-4);

                    const crc = getCrc16(Array.from(ans3).map(item => item.charCodeAt()));
                    const crcStr = ('0000' + crc.toString(16)).substr(-4).toUpperCase();

                    const message = head + packLen + ans3 + crcStr + '\r\n';
                    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}]-发送数据: ${message}`);
                    socket.write(message);
                  }
                } catch (e) {
                  console.error(e.message);
                }
              });
              socket.on('close', () => {
                client[i] = null;
              });
              socket.on('error', () => {
                client[i] = null;
              });
              client[i] = socket;
            }
            client[i].write(message);
            console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}]-发送数据: ${message}`);
          }
        } catch (err) {
          console.log(`[${facId}]获取数据失败`);
        }
      }
    }
  }
}

module.exports = UpdateData;
