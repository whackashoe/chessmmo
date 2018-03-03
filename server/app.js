#!/usr/bin/env node

/**************************************************
 *
 * INITIALIZATION
 *
 *************************************************/

var config  = require('./config');
var moment  = require('moment');
var path    = require('path');


/**************************************************
 *
 * SERVER STRUCTURES
 *
 *************************************************/

var game = {
    ba: config.ba,    // total board area
    clen: config.countdown_length, // countdown length
    players: {},
    board: [[]],
    player_colors: ['#003300','#003333','#003366','#003399','#0033CC','#0033FF','#006600','#006633','#006666','#006699','#0066CC','#0066FF','#009900','#009933','#009966','#009999','#0099CC','#0099FF','#00CC00','#00CC33','#00CC66','#00CC99','#00CCCC','#00CCFF','#00FF00','#00FF33','#00FF66','#00FF99','#00FFCC','#00FFFF','#330000','#330033','#330066','#330099','#3300CC','#3300FF','#333300','#333333','#333366','#333399','#3333CC','#3333FF','#336600','#336633','#336666','#336699','#3366CC','#3366FF','#339900','#339933','#339966','#339999','#3399CC','#3399FF','#33CC00','#33CC33','#33CC66','#33CC99','#33CCCC','#33CCFF','#33FF00','#33FF33','#33FF66','#33FF99','#33FFCC','#33FFFF','#660000','#660033','#660066','#660099','#6600CC','#6600FF','#663300','#663333','#663366','#663399','#6633CC','#6633FF','#666600','#666633','#666666','#666699','#6666CC','#6666FF','#669900','#669933','#669966','#669999','#6699CC','#6699FF','#66CC00','#66CC33','#66CC66','#66CC99','#66CCCC','#66CCFF','#66FF00','#66FF33','#66FF66','#66FF99','#66FFCC','#66FFFF','#990000','#990033','#990066','#990099','#9900CC','#9900FF','#993300','#993333','#993366','#993399','#9933CC','#9933FF','#996600','#996633','#996666','#996699','#9966CC','#9966FF','#999900','#999933','#999966','#999999','#9999CC','#9999FF','#99CC00','#99CC33','#99CC66','#99CC99','#99CCCC','#99CCFF','#99FF00','#99FF33','#99FF66','#99FF99','#99FFCC','#99FFFF','#CC0000','#CC0033','#CC0066','#CC0099','#CC00CC','#CC00FF','#CC3300','#CC3333','#CC3366','#CC3399','#CC33CC','#CC33FF','#CC6600','#CC6633','#CC6666','#CC6699','#CC66CC','#CC66FF','#CC9900','#CC9933','#CC9966','#CC9999','#CC99CC','#CC99FF','#CCCC00','#CCCC33','#CCCC66','#CCCC99','#CCCCCC','#CCCCFF','#CCFF00','#CCFF33','#CCFF66','#CCFF99','#CCFFCC','#CCFFFF','#FF0000','#FF0033','#FF0066','#FF0099','#FF00CC','#FF00FF','#FF3300','#FF3333','#FF3366','#FF3399','#FF33CC','#FF33FF','#FF6600','#FF6633','#FF6666','#FF6699','#FF66CC','#FF66FF','#FF9900','#FF9933','#FF9966','#FF9999','#FF99CC','#FF99FF','#FFCC00','#FFCC33','#FFCC66','#FFCC99','#FFCCCC','#FFCCFF','#FFFF00','#FFFF33','#FFFF66','#FFFF99','#FFFFCC'],
    color_inc: 0,
    socket_to_player_id: {},

    init: function()
    {
        for(var y=0; y<this.ba; ++y) {
            this.board.push([]);

            for(var x=0; x<this.ba; ++x) {
                this.board[y].push(null);
            }
        }
    },

    make_player: function(socket_id)
    {
        var pieces = [];

        var x = 1;
        var y = 1;

        var found_spot = false;
        var sh = 6;
        var sw = 6;

        var sss = 6;

        var cur_positions = [];

        for(var yi=0; yi<this.ba; ++yi) {
            for(var xi=0; xi<this.ba; ++xi) {
                if(this.board[yi][xi] != null && ! this.board[yi][xi].abandoned) {
                    cur_positions.push({ x: xi, y: yi });
                }
            }
        }

        if(cur_positions.length == 0) {
            cur_positions.push({
                x: Math.floor(2+ (Math.random() * (this.ba-2))),
                y: Math.floor(2+ (Math.random() * (this.ba-2)))
            });
        }

        for(var i=0; i<1000; ++i) {
            var ptb = cur_positions[Math.floor(Math.random() * cur_positions.length)];

            x = Math.floor(ptb.x + (-(sw*sss/2) + (Math.random() * sw*sss)));
            y = Math.floor(ptb.y + (-(sh*sss/2) + (Math.random() * sh*sss)));

            if(x < 2 || y < 2 || x+sw+2 >= this.ba || y+sh+2 >= this.ba) {
                continue;
            }

            var full = false;
            var yend = y+sh;
            var xend = x+sw;

            floop: for(var yi=y-2; yi<yend+2; ++yi) {
                for(var xi=x-2; xi<xend+2; ++xi) {
                    if(this.board[yi][xi] != null) {
                        if(this.board[yi][xi].abandoned && this.board[yi][xi].piece != "king") {
                            continue;
                        }
                        full = true;
                        break floop;
                    }
                }
            }

            if(! full) {
                found_spot = true;
                break;
            }
        }

        if(! found_spot) {
            return false;
        }

        var player_id = Math.floor(Math.random() * (1 << 30));

        pieces.push(this.make_piece(player_id, "rook",   x+0, y+0));
        pieces.push(this.make_piece(player_id, "knight", x+1, y+0));
        pieces.push(this.make_piece(player_id, "bishop", x+2, y+0));
        pieces.push(this.make_piece(player_id, "knight", x+3, y+0));
        pieces.push(this.make_piece(player_id, "rook",   x+4, y+0));

        pieces.push(this.make_piece(player_id, "knight", x+0, y+1));
        pieces.push(this.make_piece(player_id, "pawn",   x+1, y+1));
        pieces.push(this.make_piece(player_id, "pawn",   x+2, y+1));
        pieces.push(this.make_piece(player_id, "pawn",   x+3, y+1));
        pieces.push(this.make_piece(player_id, "knight", x+4, y+1));

        pieces.push(this.make_piece(player_id, "bishop", x+0, y+2));
        pieces.push(this.make_piece(player_id, "pawn",   x+1, y+2));
        pieces.push(this.make_piece(player_id, "queen",  x+2, y+2));
        pieces.push(this.make_piece(player_id, "pawn",   x+3, y+2));
        pieces.push(this.make_piece(player_id, "bishop", x+4, y+2));

        pieces.push(this.make_piece(player_id, "bishop", x+0, y+3));
        pieces.push(this.make_piece(player_id, "pawn",   x+1, y+3));
        pieces.push(this.make_piece(player_id, "king",   x+2, y+3));
        pieces.push(this.make_piece(player_id, "pawn",   x+3, y+3));
        pieces.push(this.make_piece(player_id, "bishop", x+4, y+3));

        pieces.push(this.make_piece(player_id, "knight", x+0, y+4));
        pieces.push(this.make_piece(player_id, "pawn",   x+1, y+4));
        pieces.push(this.make_piece(player_id, "pawn",   x+2, y+4));
        pieces.push(this.make_piece(player_id, "pawn",   x+3, y+4));
        pieces.push(this.make_piece(player_id, "knight", x+4, y+4));

        pieces.push(this.make_piece(player_id, "rook",   x+0, y+5));
        pieces.push(this.make_piece(player_id, "knight", x+1, y+5));
        pieces.push(this.make_piece(player_id, "bishop", x+2, y+5));
        pieces.push(this.make_piece(player_id, "knight", x+3, y+5));
        pieces.push(this.make_piece(player_id, "rook",   x+4, y+5));

        for(var i=0; i<pieces.length; ++i) {
            this.board[pieces[i].y][pieces[i].x] = pieces[i];
        }

        this.color_inc++;

        return {
            pieces:    pieces,
            player_id: player_id,
            color:     this.player_colors[this.color_inc % this.player_colors.length],
            socket_id: socket_id,
            since:     (new Date).getTime(),
            abandoned: false,
            stats: {
                killed:    0,
                lost:      0,
                takeovers: 0,
                points:    0,
            }
        }
    },

    add_player: function(player)
    {
        this.players[player.player_id] = player;
        this.socket_to_player_id[player.socket_id] = player.player_id;
    },

    make_piece: function(player_id, piece, x, y)
    {
        return {
            player_id: player_id,
            piece:     piece,
            x:         x,
            y:         y
        };
    },

    add_piece: function(piece)
    {
        this.board[piece.y][piece.x] = piece;
    },

    movable: function(player_id, x, y)
    {
        if(x < 0 || y < 0 || x >= this.ba || y >= this.ba) {
            return false;
        }

        if(this.board[y][x] == null) {
            return true;
        }

        if(this.board[y][x].player_id != player_id) {
            return true;
        }

        return false;
    },

    empty_square: function(x, y)
    {
        if(x < 0 || y < 0 || x >= this.ba || y >= this.ba) {
            return false;
        }

        if(this.board[y][x] == null) {
            return true;
        }

        return false;
    },

    gen_potential_moves: function(piece)
    {
        var moves = [];
        var player_id = piece.player_id;

        switch(piece.piece) {
            case "pawn":
                if(this.empty_square(piece.x - 1, piece.y)) moves.push({ x: piece.x - 1, y: piece.y });
                if(this.empty_square(piece.x + 1, piece.y)) moves.push({ x: piece.x + 1, y: piece.y });
                if(this.empty_square(piece.x, piece.y - 1)) moves.push({ x: piece.x, y: piece.y - 1 });
                if(this.empty_square(piece.x, piece.y + 1)) moves.push({ x: piece.x, y: piece.y + 1 });
                break;
            case "knight":
                if(this.movable(player_id, piece.x - 1, piece.y - 2)) moves.push({ x: piece.x - 1, y: piece.y - 2});
                if(this.movable(player_id, piece.x + 1, piece.y - 2)) moves.push({ x: piece.x + 1, y: piece.y - 2});
                if(this.movable(player_id, piece.x - 2, piece.y - 1)) moves.push({ x: piece.x - 2, y: piece.y - 1});
                if(this.movable(player_id, piece.x - 2, piece.y + 1)) moves.push({ x: piece.x - 2, y: piece.y + 1});
                if(this.movable(player_id, piece.x + 2, piece.y - 1)) moves.push({ x: piece.x + 2, y: piece.y - 1});
                if(this.movable(player_id, piece.x + 2, piece.y + 1)) moves.push({ x: piece.x + 2, y: piece.y + 1});
                if(this.movable(player_id, piece.x - 1, piece.y + 2)) moves.push({ x: piece.x - 1, y: piece.y + 2});
                if(this.movable(player_id, piece.x + 1, piece.y + 2)) moves.push({ x: piece.x + 1, y: piece.y + 2});
                break;
            case "rook":
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y };
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y };
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x, y: piece.y - i};
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x, y: piece.y + i};
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                break;
            case "bishop":
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y - i };
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y - i};
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y + i};
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y + i};
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                break;
            case "queen":
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y };
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y };
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x, y: piece.y - i};
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x, y: piece.y + i};
                    if(this.movable(player_id, piece.x, piece.y + i)) moves.push(m);
                    if(! this.empty_square(piece.x, piece.y + i)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y - i };
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y - i};
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y + i}
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y + i};
                    if(this.movable(player_id, m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                break;
            case "king":
                if(this.movable(player_id, piece.x, piece.y - 1))     moves.push({ x: piece.x,     y: piece.y - 1 });
                if(this.movable(player_id, piece.x, piece.y + 1))     moves.push({ x: piece.x,     y: piece.y + 1 });
                if(this.movable(player_id, piece.x - 1, piece.y))     moves.push({ x: piece.x - 1, y: piece.y });
                if(this.movable(player_id, piece.x + 1, piece.y))     moves.push({ x: piece.x + 1, y: piece.y });
                if(this.movable(player_id, piece.x - 1, piece.y - 1)) moves.push({ x: piece.x - 1, y: piece.y - 1 });
                if(this.movable(player_id, piece.x - 1, piece.y + 1)) moves.push({ x: piece.x - 1, y: piece.y + 1 });
                if(this.movable(player_id, piece.x + 1, piece.y + 1)) moves.push({ x: piece.x + 1, y: piece.y + 1 });
                if(this.movable(player_id, piece.x + 1, piece.y - 1)) moves.push({ x: piece.x + 1, y: piece.y - 1 });
                break;
        }

        return moves;
    },

    takeover_player: function(old_player_id, new_player_id)
    {
        var abandoned = this.players[old_player_id].abandoned;

        var amnt = 0;
        for(var y=0; y<this.ba; ++y) {
            for(var x=0; x<this.ba; ++x) {
                if(this.board[y][x] != null && this.board[y][x].player_id == old_player_id) {
                    if(abandoned) {
                        if(amnt % 2 == 0) {
                            game.board[y][x].player_id = new_player_id;
                        } else {
                            game.board[y][x] = null;
                        }
                    } else {
                        this.board[y][x].player_id = new_player_id;
                    }

                    amnt++;
                }
            }
        }

        this.players[new_player_id].stats.takeovers++;
        this.players[new_player_id].stats.points += 1000 + (75 * amnt);

        io.sockets.emit('takeover', {
            lost: old_player_id,
            win:  new_player_id
        });
    },
};

game.init();

process.argv.forEach(function (val, index, array) {
    config.port = val;
});

var io = require('socket.io').listen(config.port);
console.log('mmochess started on 127.0.0.1:' + config.port);


/**************************************************
 *
 * SOCKET.IO EVENT HANDLING
 *
 *************************************************/

/*
 * new socket.io connection initiated
 */
io.on('connection', function(socket)
{
    if(config.verbose) {
        console.log('connect: socket_id => ' + socket.id);
    }

    /*
     * socket.io connection closed
     */
    socket.on('disconnect', function()
    {
        var player_id = game.socket_to_player_id[socket.id];

        if(player_id !== undefined) {
            var player = game.players[player_id];

            if(player !== undefined) {
                player.abandoned = true;
                io.sockets.emit('abandoned', player_id);
            }
        }

        if(config.verbose) {
            console.log('disconnect: socket_id => ' + socket.id);
        }
    });

    socket.on('hello', function()
    {
        var player = game.make_player(socket.id);
        if(! player) {
            io.sockets.connected[socket.id].emit('err', {
                'code': 0x1000,
                'msg': 'server is full'
            });

            if(config.verbose) {
                console.log('hello: socket_id => ' + socket.id);
            }

            return;
        }

        game.add_player(player);

        socket.broadcast.emit('add_player', player);

        io.sockets.connected[socket.id].emit('hello', {
            player:           player,
            players:          game.players,
            board:            game.board,
            ba:               config.ba,
            countdown_length: config.countdown_length
        });

        if(config.verbose) {
            console.log('hello: socket_id => ' + socket.id);
        }
    });

    socket.on('move', function(data)
    {
        if(typeof data === 'undefined'
        || typeof data.from === 'undefined' || typeof data.from.x !== 'number' || typeof data.from.y !== 'number'
        || typeof data.to   === 'undefined' || typeof data.to.x   !== 'number' || typeof data.to.y   !== 'number'
        ) {
            socket.emit('err', {
                'code': 0x1002,
                'msg': 'bad move sent'
            });
            return;
        }


        var curtime = (new Date).getTime();

        if(game.players[game.socket_to_player_id[socket.id]].since > curtime - config.countdown_length) {
            socket.emit('err', {
                'code': 0x1003,
                'msg': 'early move sent'
            });
            return;
        }

        var piece = game.board[data.from.y][data.from.x];
        var to_piece = game.board[data.to.y][data.to.x];

        if(piece == null) {
            socket.emit('err', {
                'code': 0x1004,
                'msg': 'piece does not exist'
            });
            return;
        }

        if(piece.player_id != game.socket_to_player_id[socket.id]) {
            socket.emit('err', {
                'code': 0x1005,
                'msg': 'bad player id to socket id'
            });
            return;
        }

        var possible_moves = game.gen_potential_moves(piece);
        var found = false;

        for(var i=0; i<possible_moves.length; ++i) {
            if(possible_moves[i].y == data.to.y && possible_moves[i].x == data.to.x) {
                found = true;
                break;
            }
        }

        if(! found) {
            socket.emit('err', {
                'code': 0x1006,
                'msg': 'move not found'
            });
            return;
        }

        if(to_piece != null) {
            game.players[to_piece.player_id].stats.lost++;
            game.players[to_piece.player_id].stats.points -= 50;

            game.players[piece.player_id].stats.killed++;
            game.players[piece.player_id].stats.points += 100;
        }

        game.board[data.to.y][data.to.x] = null;
        game.board[data.from.y][data.from.x] = null;
        game.board[data.to.y][data.to.x] = piece;
        piece.x = data.to.x;
        piece.y = data.to.y;

        io.sockets.emit('move', {
            from: {
                x: data.from.x,
                y: data.from.y,
            },
            to: {
                x: data.to.x,
                y: data.to.y
            }
        });

        if(to_piece != null && to_piece.piece == "king") {
            game.takeover_player(to_piece.player_id, game.socket_to_player_id[socket.id]);
        }

        game.players[game.socket_to_player_id[socket.id]].since = curtime;

        if(config.verbose) {
            console.log('move: socket_id => ' + socket.id + ' data: ');
            console.log(data);
        }
    });

    socket.on('chat', function(content) {
        if(typeof content !== 'string') {
            socket.emit('err', {
                'code': 0x1001,
                'msg': 'bad chat message sent'
            });
            return;
        }

        io.sockets.emit('chat', {
            player_id: game.socket_to_player_id[socket.id],
            content:   content
        });

        if(config.verbose) {
            console.log('chat: socket_id => ' + socket.id);
        }
    });
});

function send_stats()
{
    var stats = [];

    for(var i in game.players) {
        if(! game.players[i].abandoned) {
            stats.push({
                player_id: game.players[i].player_id,
                killed:    game.players[i].stats.killed,
                lost:      game.players[i].stats.lost,
                takeovers: game.players[i].stats.takeovers,
                points:    game.players[i].stats.points,
            });
        }
    }

    io.sockets.emit('stats', stats);
    setTimeout(send_stats, 2000);
}

send_stats();
