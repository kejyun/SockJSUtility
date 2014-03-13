// 引用套件
var http = require('http');
var sockjs = require('sockjs');
var SocketManager = require('./SocketManager');

// 建立 SockJS Server
var sockjs_echo = sockjs.createServer();


sockjs_echo.on('connection', function(conn) {
    // Connection 引用延伸套件
    SocketManager.ConnUtility(conn);
    SocketManager.ChatRooms(conn);

    conn.on('send_from_client' , function (message) {
        var msg = {
            reveive_msg : message
        };
        // 廣播訊息給所有連線
        conn.broadcast_to_all('send_from_server' , msg);
    });
});

var server = http.createServer();

server.addListener('upgrade', function(req,res){
    res.end();
});

// 設定 SockJS 參數
sockjs_echo.installHandlers(server, {prefix:'/echo'});

var port = 5566;
console.log(' [*] Listening on 0.0.0.0:'+port );
server.listen(port, '0.0.0.0');