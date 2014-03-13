/**
 * Socket管理器
 */
// 所有連線加入的聊天室 : ConnectionRooms[conn.id] = {'room1' : true , 'room2' : true};
var ConnectionRooms = {};
// 所有聊天室的連線 : RoomConnections['room1'] = [conn1.id , conn2.id];
var RoomConnections = {};
// 所有連線紀錄 : Connections[conn.id] = conn;
var Connections = {};


var ChatRooms = function (conn) {
    if (conn)
    {
        // 連線編號
        var allroom = 'allroom';
        var cid = conn.id;
        if (!Connections[cid])
        {
            // 沒有此編號連線紀錄，記錄此連線
            Connections[cid] = conn;
        }
        // 聊天室管理工具
        var RoomManager = {
            /**
             *  加入聊天室
             */
            joinRoom : function (room_name) {
                if (!ConnectionRooms[cid])
                {
                    // 檢查Client有無加入任何聊天室，沒有則建立加入的聊天室清單
                    ConnectionRooms[cid] = {};
                }

                if (!RoomConnections[room_name])
                {
                    // 檢查有無存在此聊天室，沒有則建立聊天室
                    RoomConnections[room_name] = [];
                }

                if (!~RoomConnections[room_name].indexOf(cid))
                {
                    // 檢查連線有沒有加入該聊天室了，沒有加入的話將此連線加入聊天室
                    RoomConnections[room_name].push(cid);
                    ConnectionRooms[cid][room_name] = true;
                    // 發送加入事件訊息
                    var emitMessage = {
                        cid : cid,
                        room_name : room_name
                    };
                    conn.emit && conn.emit('joinRoom' , emitMessage);
                }
                return this;
            },

            /**
             *  離開聊天室
             */
            leaveRoom : function (room_name) {
                if (RoomConnections[room_name])
                {
                    // 若該聊天室有建立
                    // 撈取連線編號存放位置
                    var cid_index = RoomConnections[room_name].indexOf(cid);
                    if (cid_index >=0)
                    {
                        // 該連線編號有存在聊天室中，移除該連線編號
                        RoomConnections[room_name].splice(cid_index , 1);
                    }

                    if (!RoomConnections[room_name].length)
                    {
                        // 若該聊天室無任何連線存在，移除該聊天室資訊
                        RoomConnections[room_name] = null;
                        delete RoomConnections[room_name];
                    }

                    if (ConnectionRooms[cid] && ConnectionRooms[cid][room_name])
                    {
                        // 若有使用者加入的聊天室資料，移除該聊天室資料
                        ConnectionRooms[cid][room_name] = null;
                        delete ConnectionRooms[cid][room_name];

                        // 發送離開事件訊息
                        var emitMessage = {
                            cid : cid,
                            room_name : room_name
                        };
                        conn.emit && conn.emit('leaveRoom' , emitMessage);
                    }
                }
                return this;
            },

            /**
             *  廣播訊息到所有人
             */
            broadcast_to_all : function (event , message) {
                this.broadcast(allroom , event , message);
                return this;
            },

            /**
             *  廣播訊息到指定聊天室(除了自己)
             */
            broadcast_except_self : function (room_name , event , message) {
                var exclude_cids = [];
                // 排除自己
                exclude_cids.push(cid);
                this.broadcast(room_name , event , message , exclude_cids);
                return this;
            },

            /**
             *  廣播訊息到指定聊天室
             */
            broadcast : function (room_name , event , message , exclude_cids) {
                if (room_name && event && RoomConnections[room_name])
                {
                    var broadcast_message;
                    if (!message)
                    {
                        // 若沒有傳訊息參數，第二個參數為訊息
                        broadcast_message = event;
                    }
                    else
                    {
                        // 傳送方式為事件訊息
                        broadcast_message = {
                            event : event,
                            data : message
                        };
                    }

                    // 若該聊天室有建立
                    exclude_cids = exclude_cids || [];
                    
                    // 傳送所有訊息到該聊天室的連線
                    for (var i = 0, l = RoomConnections[room_name].length; i < l; i++)
                    {
                        var id = RoomConnections[room_name][i];
                        // console.log(!~exclude_cids.indexOf(id));
                        if (!~exclude_cids.indexOf(id))
                        {
                            // 若沒有在需要排除傳送的訊息的連線，發送廣播訊息
                            Connections[id].write( JSON.stringify(broadcast_message) );
                        }
                    }
                }
                return this;
            },

            /**
             *  自己碎碎念訊息
             */
            whisper : function (event , message) {
                var whisper_message;
                if (event)
                {
                    if (!message)
                    {
                        // 若沒有傳訊息參數，第一個參數為訊息
                        whisper_message = event;
                    }
                    else
                    {
                        // 傳送方式為事件訊息
                        whisper_message = {
                            event : event,
                            data : message
                        };
                    }
                    // 傳送訊息給自己
                    Connections[cid].write( JSON.stringify(whisper_message) );
                }
                return this;
            }
        };

        // 合併方法
        JSUtility.merge(conn , RoomManager);

        // 加入所有聊天室
        conn.joinRoom(allroom);

        // 連線中斷時，移除暫存連線資源
        conn.on('close', function () {
            // 離開所有聊天室
            for (var room_name in ConnectionRooms[cid]) {
                if (ConnectionRooms[cid].hasOwnProperty(room_name))
                {
                    // 離開聊天室
                    conn.leaveRoom(room_name);
                }
            }

            // 移除該連線聊天室資訊
            ConnectionRooms[cid] = null;
            delete ConnectionRooms[cid];

            // 移除連線暫存資源
            Connections[cid] = null;
            delete Connections[cid];
        });
    }
};

// Socket連線延伸功能擴充
var ConnUtility = function (conn)
{
    conn.on && conn.on('data', function(message) {
        try{
            // 嘗試解析字串(訊息事件處理)
            var msg = JSON.parse(message);
            if (msg.event && msg.data)
            {
                // 若有傳送訊息，且有指定訊息事件
                conn.emit(msg.event , msg.data);
            }
        }
        catch(e){}
    });
};


// JS相關工具
var JSUtility = {
    /**
     *  合併兩物件
     */
    merge : function (target, additional, deep, lastseen) {
        var seen = lastseen || [],
            depth = typeof deep == 'undefined' ? 2 : deep,
            prop,
            target = target || {};

        for (prop in additional) {
            if (additional.hasOwnProperty(prop) && JSUtility.indexOf(seen, prop) < 0) {
                // 是合併物件自己的屬性
                if (typeof target[prop] !== 'object' || !depth) {
                    // 合併物件
                    target[prop] = additional[prop];
                    seen.push(additional[prop]);
                } else {
                    // 合併下一層
                    JSUtility.merge(target[prop], additional[prop], depth - 1, seen);
                }
            }
        }
        return target;
    },
    /**
     *  合併prototype
     */
    mixin : function(ctor, ctor2) {
        JSUtility.merge(ctor.prototype, ctor2.prototype);
    },
    /**
     *  陣列索引
     */
    indexOf : function(arr, o, i) {
        for (var j = arr.length, 
            i = i < 0 ? 
                i + j < 0 ? 0 : i + j 
                : i || 0;
            i < j && arr[i] !== o; 
            i++) {}

        return j <= i ? -1 : i;
    },
    /**
     *  是否為陣列
     */
    isArray : function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },
    /**
     *  是否為物件
     */
    isObject : function(obj) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    }
};


// 管理工具輸出
// 聊天室管理
exports.ChatRooms = ChatRooms;
// 聊天室管理
exports.ConnUtility = ConnUtility;
// JS工具
exports.JSUtility = JSUtility;