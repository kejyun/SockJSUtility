SockJSUtility
=============

## 說明

程式為 Node.js SockJS 的延伸工具，概念是參考 Socket.io 的 Client 端連線方法

主要是增加下列功能

1. Socket 連線中斷時自動重連Server機制
2. 使用事件方法傳送訊息



## 範例

### 1) 引用檔案

```html
<!-- 引用 SockJS Client 端程式-->
<script src="http://cdn.sockjs.org/sockjs-0.3.min.js"></script>
<!--- 引用 SockJSUtility 工具程式 -->
<script src="sockjs.utility-0.1.js"></script>
```

### 2) 連線到 Socket Server

#### Client 端程式

```javascript
// 連線的 Socket Server
var sockjs_url = 'http://socket.server:5566/echo';
// SockJSUtility 選項設定
var opt = {
    host : sockjs_url
};
// 使用 SockJSUtility 連線到 SockJS Server
var sockjs = SockJSUtility.connect(opt);

// 接收伺服器事件為"send_from_server"的訊息
sockjs.on('send_from_server' , function (data) {
    // data 為從 Server傳送過來的訊息或物件資料
    console.log(data);
});

// 傳送訊息給 Socket Server(指定訊息事件為"send_from_client")
var message = 'From Client Message';
sockjs.send('send_from_client' , message);
```


#### Node.js Server 端程式


**sockjs_server.js**

```javascript
// 引用套件
var http = require('http');
var sockjs = require('sockjs');
// 引用 Socket 套件管理工具
var SocketManager = require('./SocketManager');

// 建立 SockJS Server
var sockjs_echo = sockjs.createServer();

sockjs_echo.on('connection', function(conn) {
    // Connection 引用延伸套件
    // 可以使用事件傳遞訊息
    SocketManager.ConnUtility(conn);
    // 可以使用聊天室功能(預設會將所有連線加入到預設聊天室"allroom")
    SocketManager.ChatRooms(conn);

    // 接收到 Client 端的 "send_from_client" 事件訊息
    conn.on('send_from_client' , function (message) {
        var msg = {
            reveive_msg : message
        };
        // 廣播訊息給所有連線
        conn.broadcast_to_all('send_from_server' , msg);
    });
});

var server = http.createServer();

// 設定 SockJS 參數
sockjs_echo.installHandlers(server, {prefix:'/echo'});

var port = 5566;
console.log(' [*] Listening on 0.0.0.0:'+port );
server.listen(port, '0.0.0.0');
```

詳細可執行範例請參考 example 資料夾的可執行範例

## 選項參數


| 選項值        | 說明           | 預設  |
| ------------- |:-------------:| -----:|
| host      | Socket 伺服器位址 | - |
| need_reconnect      | 是否需要重新連線 | true |
| reconnection_delay      | 重新連線延遲時間(預設0.5秒) | 500 |
| reconnection_delay_limit      | 重新連線限制(無限制) | Infinity |
| max_reconnection_attempts      | 最大重連嘗試次數 | 20 |


```javascript
// 連線的 Socket Server
var sockjs_url = 'http://socket.server:5566/echo';
// SockJSUtility 選項設定
var opt = {
  host : sockjs_url,
  need_reconnect : true,
  reconnection_delay : 500
  reconnection_delay_limit : Infinity,
  max_reconnection_attempts : 20,
};
// 使用 SockJSUtility 連線到 SockJS Server
var sockjs = SockJSUtility.connect(opt);
```


## sockjs 方法


| 方法名稱        | 說明           | 範例  |
| ------------- |:-------------:| -----:|
| send      | 傳送事件訊息 | sockjs.send('event_name' , 'message'); |
| disconnect      | 中斷重新連線 | sockjs.disconnect(); |
| on      | 接收事件訊息 | sockjs.on('send_from_server_event' , function (data) { console.log(data)}) |


SockJSUtility 支援原生的方法，所以也可以使用原生的方法去傳送與接收資料，然後僅使用 Socket 斷線時重新連線的功能

```javascript
// Socket 已連線
sockjs.onopen = function(){
  console.log('socket connect');
};

// 接收 Socket 訊息
sockjs.onmessage = function(e){
  console.log('socket message receive');
};

// Socket 已關閉
sockjs.onclose = function(){
  console.log('socket close');
};

// 傳送訊息
var message = 'Send From Client';
sockjs.send(message);
```


## Socket Server 連線狀態

```javascript
console.log(sockjs.connected);
console.log(sockjs.connecting);
```

| 狀態值        | 說明           | 預設  |
| ------------- |:-------------:| -----:|
| connected      | 是否已連線 (當嘗試連線 Socket Server 時狀態為 true) | false |
| connecting      | 是否連線中 (當連線成功時狀態為 true) | false |



## node.js SocketManager Socket管理器 (SocketManager.js)

1. 聊天室功能(Chatroom)
2. 訊息事件(event message)


```javascript
// 引用 Socket 套件管理工具
var SocketManager = require('./SocketManager');

// 建立 SockJS Server
var sockjs_echo = sockjs.createServer();

sockjs_echo.on('connection', function(conn) {
    // Connection 引用延伸套件
    // 可以使用事件傳遞訊息
    SocketManager.ConnUtility(conn);
    // 可以使用聊天室功能(預設會將所有連線加入到預設聊天室"allroom")
    SocketManager.ChatRooms(conn);

    // 加入聊天室 "room1"
    conn.joinRoom('room1');
    // 離開聊天室
    conn.leaveRoom('room2');

    // 接收到 Client 端的 "send_from_client" 事件訊息
    conn.on('send_from_client' , function (message) {
        var msg = {
            reveive_msg : message
        };

        // 廣播訊息給所有連線
        conn.broadcast_to_all('send_from_server' , msg);

        // 廣播訊息到指定聊天室(除了自己)
        conn.broadcast_except_self('room1' ,'send_from_server' , msg);

        // 廣播訊息到指定聊天室
        conn.broadcast('room1' ,'send_from_server' , msg);

        // 自己碎碎念訊息
        conn.whisper('send_from_server' , msg);
    });
});
```


| 方法名稱        | 說明           | 範例  |
| ------------- |:-------------:| -----:|
| broadcast_to_all      | 廣播訊息給所有連線 | conn.broadcast_to_all('send_from_server' , msg); |
| broadcast_except_self      | 廣播訊息到指定聊天室(除了自己) | conn.broadcast_except_self('room1' ,'send_from_server' , msg); |
| broadcast      | 廣播訊息到指定聊天室 | conn.broadcast('room1' ,'send_from_server' , msg); |
| whisper      | 自己碎碎念訊息 | conn.whisper('send_from_server' , msg); |
| on      | 接收事件訊息 | conn.on('send_from_client' , function (message) { console.log(message)} ); |