var stats = new Stats();
stats.setMode(1);

stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';

document.body.appendChild(stats.domElement);

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");


ion.sound({
    sounds: [
        {name: "game_start"},
        {name: "move"},
        {name: "takeover_other"},
        {name: "takenover", loop: 6},
        {name: "piece_lost"},
        {name: "piece_destroyed"}
    ],

    // main config
    path: "/sounds/",
    preload: true,
    multiplay: true,
    volume: 0.9
});

var game = {
    bw: window.innerWidth,  // visible board width
    bh: window.innerHeight, // visible board height
    bs: 48,                 // visible board size
    ba: 128,                // total board area
	pan_speed: 2.0,         // speed to drag
    clen: 3000,             // countdown length
    min_zoom: 16,
    max_zoom: 128,
    last_move_show_time: 15000,
    tx: 5,                  // translation x/y
    ty: 5,                  // translation x/y
    player_colors: ['#003300','#003333','#003366','#003399','#0033CC','#0033FF','#006600','#006633','#006666','#006699','#0066CC','#0066FF','#009900','#009933','#009966','#009999','#0099CC','#0099FF','#00CC00','#00CC33','#00CC66','#00CC99','#00CCCC','#00CCFF','#00FF00','#00FF33','#00FF66','#00FF99','#00FFCC','#00FFFF','#330000','#330033','#330066','#330099','#3300CC','#3300FF','#333300','#333333','#333366','#333399','#3333CC','#3333FF','#336600','#336633','#336666','#336699','#3366CC','#3366FF','#339900','#339933','#339966','#339999','#3399CC','#3399FF','#33CC00','#33CC33','#33CC66','#33CC99','#33CCCC','#33CCFF','#33FF00','#33FF33','#33FF66','#33FF99','#33FFCC','#33FFFF','#660000','#660033','#660066','#660099','#6600CC','#6600FF','#663300','#663333','#663366','#663399','#6633CC','#6633FF','#666600','#666633','#666666','#666699','#6666CC','#6666FF','#669900','#669933','#669966','#669999','#6699CC','#6699FF','#66CC00','#66CC33','#66CC66','#66CC99','#66CCCC','#66CCFF','#66FF00','#66FF33','#66FF66','#66FF99','#66FFCC','#66FFFF','#990000','#990033','#990066','#990099','#9900CC','#9900FF','#993300','#993333','#993366','#993399','#9933CC','#9933FF','#996600','#996633','#996666','#996699','#9966CC','#9966FF','#999900','#999933','#999966','#999999','#9999CC','#9999FF','#99CC00','#99CC33','#99CC66','#99CC99','#99CCCC','#99CCFF','#99FF00','#99FF33','#99FF66','#99FF99','#99FFCC','#99FFFF','#CC0000','#CC0033','#CC0066','#CC0099','#CC00CC','#CC00FF','#CC3300','#CC3333','#CC3366','#CC3399','#CC33CC','#CC33FF','#CC6600','#CC6633','#CC6666','#CC6699','#CC66CC','#CC66FF','#CC9900','#CC9933','#CC9966','#CC9999','#CC99CC','#CC99FF','#CCCC00','#CCCC33','#CCCC66','#CCCC99','#CCCCCC','#CCCCFF','#CCFF00','#CCFF33','#CCFF66','#CCFF99','#CCFFCC','#CCFFFF','#FF0000','#FF0033','#FF0066','#FF0099','#FF00CC','#FF00FF','#FF3300','#FF3333','#FF3366','#FF3399','#FF33CC','#FF33FF','#FF6600','#FF6633','#FF6666','#FF6699','#FF66CC','#FF66FF','#FF9900','#FF9933','#FF9966','#FF9999','#FF99CC','#FF99FF','#FFCC00','#FFCC33','#FFCC66','#FFCC99','#FFCCCC','#FFCCFF','#FFFF00','#FFFF33','#FFFF66','#FFFF99','#FFFFCC'],
    board_color_light: '#F3D7B7',
    board_color_dark: '#B88566',
    players: [],
    board: [[]],
    me: null,
    piece_selected: null,
    sound_enabled: true,
    potential_moves: [],
    last_moves: [],
    lost: false,
    menu: true,
    waiting_to_join: false,
    server_unavailable: false,
    servers: {},
    show_error_screen: false,
    show_help: false,
    error_msg: "",
    grid_canvas: null,
    grid_canvas_ctx: null,
    pawn_canvas: null,
    knight_canvas: null,
    rook_canvas: null,
    bishop_canvas: null,
    queen_canvas: null,
    king_canvas: null,
    me_pawn_canvas: null,
    me_knight_canvas: null,
    me_rook_canvas: null,
    me_bishop_canvas: null,
    me_queen_canvas: null,
    me_king_canvas: null,
    dark_pawn_canvas: null,
    dark_knight_canvas: null,
    dark_rook_canvas: null,
    dark_bishop_canvas: null,
    dark_queen_canvas: null,
    dark_king_canvas: null,
    near_king_alert: false,

    client: {
        socket: null,
        verbose: true,

        init: function(host)
        {
            if(typeof io === 'undefined') {
                game.server_unavailable = true;
                $('#showsidebox').hide();
                return;
            }
            this.socket = io(host, { path: '/socket.io' });
            // this.socket = io('http://b8d7cabe.ngrok.io/', { path: '/socket.io' });
            
            this.socket.on('disconnect', function(data)
            {
                game.server_unavailable = true;
            });

            this.socket.on('err', function(data)
            {
                switch(data.code) {
                    case 0x1000:
                    case 0x1001:
                    case 0x1002:
                    case 0x1003:
                        game.show_error_screen = true;
                        break;
                    case 0x1004:
                    case 0x1005:
                    case 0x1006:
                        break;
                }
                game.error_msg = data.msg;
                console.error(game.error_msg);
            });

            this.socket.on('hello', function(data)
            {
                if(game.client.verbose) {
                    console.log('hello');
                    console.log(data);
                }

                if(game.show_error_screen) {
                    game.show_error_screen = false;
                }

                game.players = data.players;
                game.me      = data.player;
                game.board   = data.board;
                game.clen    = data.countdown_length;
                game.ba      = data.ba;
                game.center();

                resizeCanvas();

                game.me.since = (new Date).getTime();

                game.menu            = false;
                game.lost            = false;
                game.waiting_to_join = false;

                game.play_sound("game_start");
                showsidebox();


                for(var yy=0; yy<game.ba; ++yy) {
                    for(var xx=0; xx<game.ba; ++xx) {
                        if(game.board[yy][xx] != null) {
                            game.board[yy][xx].potential_moves = game.gen_potential_moves(game.board[yy][xx]);
                        }
                    }
                }

                game.check_near_king_alert();
            });

            this.socket.on('move', function(data)
            {
                if(game.client.verbose) {
                    console.log('move');
                    console.log(data);
                }

                var from_cell = game.board[data.from.y][data.from.x];
                var to_cell = game.board[data.to.y][data.to.x];

                if(from_cell.player_id == game.me.player_id) {
                    game.me.since = (new Date).getTime();
                }

                if(to_cell == null) {
                    game.play_sound("move");
                } else if(to_cell.player_id == game.me.player_id) {
                    game.play_sound("piece_lost");
                } else {
                    if(to_cell.piece == "king") {
                        game.play_sound("takeover_other");
                    } else {
                        game.play_sound("piece_destroyed");
                    }
                }

                game.add_last_move(data.from.x, data.from.y, data.to.x, data.to.y)

                game.board[data.to.y][data.to.x] = game.board[data.from.y][data.from.x];
                game.board[data.from.y][data.from.x] = null;
                game.board[data.to.y][data.to.x].x = data.to.x;
                game.board[data.to.y][data.to.x].y = data.to.y;

                game.update_potential_moves(data.to.x, data.to.y);
                game.update_potential_moves(data.from.x, data.from.y);

                game.check_near_king_alert();
            });

            this.socket.on('add_player', function(player) {
                if(game.client.verbose) {
                    console.log('add_player');
                    console.log(player);
                }

                game.players[player.player_id] = player;

                for(var i=0; i<player.pieces.length; ++i) {
                    game.board[player.pieces[i].y][player.pieces[i].x] = player.pieces[i];
                    game.update_potential_moves(player.pieces[i].x, player.pieces[i].y);
                }

                game.check_near_king_alert();
            });

            this.socket.on('takeover', function(data) {
                if(game.client.verbose) {
                    console.log('takeover');
                    console.log(data);
                }

                if(data.lost == game.me.player_id) {
                    game.lost = true;
                    game.play_sound("takenover");
                } else {
                    game.play_sound("takeover");
                    game.check_near_king_alert();
                }

                var amnt = 0;
                for(var y=0; y<game.ba; ++y) {
                    for(var x=0; x<game.ba; ++x) {
                        if(game.board[y][x] != null && game.board[y][x].player_id == data.lost) {
                            if(game.players[data.lost].abandoned) {
                                if(amnt % 2 == 0) {
                                    game.board[y][x].player_id = data.win;
                                } else {
                                    game.board[y][x] = null;
                                }
                            } else {
                                game.board[y][x].player_id = data.win;
                            }

                            game.update_potential_moves(x, y);
                            amnt++;
                        }
                    }
                }

            });

            this.socket.on('chat', function(data) {
                if(game.client.verbose) {
                    console.log('chat');
                    console.log(data);
                }

                var player_id =  game.players[data.player_id];

                function escapeHtml(str) {
                    var div = document.createElement('div');
                    div.appendChild(document.createTextNode(str));
                    return div.innerHTML;
                }

                var text = escapeHtml(data.content);

                if(typeof player_id == 'undefined') {
                    $('#chatbox').append('<div style="width:100%"><span style="color:#f00">not playing</span> ' + text + '</div>');
                } else {
                    $('#chatbox').append('<div style="width:100%"><span style="color:' + game.players[data.player_id].color + '">' + data.player_id + '</span> ' + text + '</div>');
                }

                $('#chatbox').scrollTop($('#chatbox').prop('scrollHeight'));
            });

            this.socket.on('stats', function(players) {
                if(game.client.verbose) {
                    console.log('stats');
                    console.log(players);
                }

                for(var i=0; i<players.length; ++i) {
                    var p = players[i];
                    var player = game.players[p.player_id];

                    if(player !== undefined) {
                        player.stats.killed    = p.killed;
                        player.stats.lost      = p.lost;
                        player.stats.takeovers = p.takeovers;
                        player.stats.points    = p.points;
                    }
                }

                if(game.me !== null) {
                    $('#killed_amount').html(game.players[game.me.player_id].stats.killed);
                    $('#lost_amount').html(game.players[game.me.player_id].stats.lost);
                    $('#takeover_amount').html(game.players[game.me.player_id].stats.takeovers);
                }
            });

            this.socket.on('abandoned', function(player_id) {
                if(game.client.verbose) {
                    console.log('abandoned');
                    console.log(player_id);
                }

                var player = game.players[player_id];
                if(typeof player !== undefined) {
                    player.abandoned = true;
                }
            });
        },

        move: function(data)
        {
            this.socket.emit('move', data);
        },

        start_game: function()
        {
            this.socket.emit('hello');
            game.waiting_to_join = true;
            $('#chat').show();
            $('#sideboxstats').show();
        },

        send_message: function()
        {
            var content = $('#chattextinput').val();
            $('#chattextinput').val('');

            if(content == '') {
                return;
            }

            this.socket.emit('chat', content);
        }
    },

    update_potential_moves: function(x, y)
    {
        if(game.piece_selected != null) {
            if(game.piece_selected.x > x - 8 && game.piece_selected.x < x + 8
            && game.piece_selected.y > y - 8 && game.piece_selected.y < y + 8) {
                game.potential_moves = game.gen_potential_moves(game.piece_selected);
            }
        }

        for(var yy=Math.max(y-8, 0); yy<Math.min(y+8, game.ba); ++yy) {
            for(var xx=Math.max(x-8, 0); xx<Math.min(x+8, game.ba); ++xx) {
                if(game.board[yy][xx] != null) {
                    if(game.players[game.board[yy][xx].player_id].abandoned) {
                        game.board[yy][xx].potential_moves = null;
                    } else {
                        game.board[yy][xx].potential_moves = game.gen_potential_moves(game.board[yy][xx]);
                    }
                }
            }
        }
    },

    zoom: function(n)
    {
        if(game.bs + n <= game.min_zoom) return;
        if(game.bs + n >= game.max_zoom) return;

        game.bs += n;

        if(n < 0) {
            game.tx -= 1;
            game.ty -= 1;
        } else {
            game.tx += 1;
            game.ty += 1;
        }
    },

    play_sound: function(src)
    {
        if(game.sound_enabled) {
            ion.sound.play(src);
        }
    },

    add_last_move: function(fromx, fromy, tox, toy, player_id)
    {
        game.last_moves.push({
            fromx: fromx,
            fromy: fromy,
            tox: tox,
            toy: toy,
            player_id: player_id,
            time: +(new Date)
        });
    },

    check_near_king_alert: function()
    {
        var kpos = game.find_king();
        var w = 8;
        var sx = Math.max(0, kpos.x - w);
        var bx = Math.min(game.ba-1, kpos.x + w);
        var sy = Math.max(0, kpos.y - w);
        var by = Math.min(game.ba-1, kpos.y + w);

        var found = false;
        outer: for(var y=sy; y<by; ++y) {
            for(var x=sx; x<bx; ++x) {
                if(game.board[y][x] != null && game.board[y][x].player_id != game.me.player_id && !game.players[game.board[y][x].player_id].abandoned) {
                    found = true;
                    break outer;
                }
            }
        }

        game.near_king_alert = found;
    },

    find_king: function()
    {
        var xi = 0;
        var yi = 0;

        outer: for(var y=0; y<this.ba; ++y) {
            for(var x=0; x<this.ba; ++x) {
                if(this.board[y][x] != null
                && this.board[y][x].player_id == this.me.player_id
                && this.board[y][x].piece == "king") {
                    xi = x;
                    yi = y;
                    break outer;
                }
            }
        }

        return { x: xi, y: yi };
    },

    center: function()
    {
        var kpos = this.find_king();

        this.tx = -kpos.x + (this.bs / 2);
        this.ty = -kpos.y + (this.bs / 5); //TODO make me nicer
    },

    init: function()
    {
        this.render();
    },

    movable: function(x, y)
    {
        if(x < 0 || y < 0 || x >= this.ba || y >= this.ba) {
            return false;
        }

        if(this.board[y][x] == null || this.board[y][x].player_id != this.me.player_id) {
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
        if(piece == null) return;

        var moves = [];

        switch(piece.piece) {
            case "pawn":
                if(this.empty_square(piece.x - 1, piece.y)) moves.push({ x: piece.x - 1, y: piece.y });
                if(this.empty_square(piece.x + 1, piece.y)) moves.push({ x: piece.x + 1, y: piece.y });
                if(this.empty_square(piece.x, piece.y - 1)) moves.push({ x: piece.x, y: piece.y - 1 });
                if(this.empty_square(piece.x, piece.y + 1)) moves.push({ x: piece.x, y: piece.y + 1 });
                break;
            case "knight":
                if(this.movable(piece.x - 1, piece.y - 2)) moves.push({ x: piece.x - 1, y: piece.y - 2});
                if(this.movable(piece.x + 1, piece.y - 2)) moves.push({ x: piece.x + 1, y: piece.y - 2});
                if(this.movable(piece.x - 2, piece.y - 1)) moves.push({ x: piece.x - 2, y: piece.y - 1});
                if(this.movable(piece.x - 2, piece.y + 1)) moves.push({ x: piece.x - 2, y: piece.y + 1});
                if(this.movable(piece.x + 2, piece.y - 1)) moves.push({ x: piece.x + 2, y: piece.y - 1});
                if(this.movable(piece.x + 2, piece.y + 1)) moves.push({ x: piece.x + 2, y: piece.y + 1});
                if(this.movable(piece.x - 1, piece.y + 2)) moves.push({ x: piece.x - 1, y: piece.y + 2});
                if(this.movable(piece.x + 1, piece.y + 2)) moves.push({ x: piece.x + 1, y: piece.y + 2});
                break;
            case "rook":
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y };
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y };
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x, y: piece.y - i};
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x, y: piece.y + i};
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                break;
            case "bishop":
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y - i };
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y - i};
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y + i};
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y + i};
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                break;
            case "queen":
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y };
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y };
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x, y: piece.y - i};
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x, y: piece.y + i};
                    if(this.movable(piece.x, piece.y + i)) moves.push(m);
                    if(! this.empty_square(piece.x, piece.y + i)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y - i };
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y - i};
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x + i, y: piece.y + i}
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                for(var i=1; i<8; ++i) {
                    var m = { x: piece.x - i, y: piece.y + i};
                    if(this.movable(m.x, m.y)) moves.push(m);
                    if(! this.empty_square(m.x, m.y)) break;
                }
                break;
            case "king":
                if(this.movable(piece.x, piece.y - 1))     moves.push({ x: piece.x,     y: piece.y - 1 });
                if(this.movable(piece.x, piece.y + 1))     moves.push({ x: piece.x,     y: piece.y + 1 });
                if(this.movable(piece.x - 1, piece.y))     moves.push({ x: piece.x - 1, y: piece.y });
                if(this.movable(piece.x + 1, piece.y))     moves.push({ x: piece.x + 1, y: piece.y });
                if(this.movable(piece.x - 1, piece.y - 1)) moves.push({ x: piece.x - 1, y: piece.y - 1 });
                if(this.movable(piece.x - 1, piece.y + 1)) moves.push({ x: piece.x - 1, y: piece.y + 1 });
                if(this.movable(piece.x + 1, piece.y + 1)) moves.push({ x: piece.x + 1, y: piece.y + 1 });
                if(this.movable(piece.x + 1, piece.y - 1)) moves.push({ x: piece.x + 1, y: piece.y - 1 });
                break;
        }

        return moves;
    },

    draw_highlighted: function(x, y)
    {
        var ts = Math.round((this.clen - ((new Date).getTime() - this.me.since)) / 100.0) / 10.0;
        ctx.lineWidth = (this.bw / this.bs) / 10;
        ctx.strokeStyle = (ts < 0.0) ? "#20A4DD" : "#E78123";
        ctx.strokeRect(((this.bw / this.bs) * x), ((this.bw / this.bs) * y), (this.bw / this.bs), (this.bw / this.bs));
        ctx.stroke();
    },

    draw_potential_move: function(player_id, x, y)
    {
        if(game.players[player_id].abandoned) return;
        var color = ((player_id == game.me.player_id) ? "#000000" : game.players[player_id].color) + "40";

        ctx.fillStyle = color;
        ctx.fillRect(((this.bw / this.bs) * x), ((this.bw / this.bs) * y), (this.bw / this.bs), (this.bw / this.bs));
    },

    draw_piece: function(piece)
    {
        var color = game.players[piece.player_id].color;
        if(piece.player_id == game.me.player_id) {
            color = "rgba(0,0,0,0)";
        }
        var abandoned = game.players[piece.player_id].abandoned

        var x = piece.x;
        var y = piece.y;

        var canvases = {
            king:   game.king_canvas,
            queen:  game.queen_canvas,
            rook:   game.rook_canvas,
            bishop: game.bishop_canvas,
            knight: game.knight_canvas,
            pawn:   game.pawn_canvas,
        };

        var me_canvases = {
            king:   game.me_king_canvas,
            queen:  game.me_queen_canvas,
            rook:   game.me_rook_canvas,
            bishop: game.me_bishop_canvas,
            knight: game.me_knight_canvas,
            pawn:   game.me_pawn_canvas,
        };

        var dark_canvases = {
            king:   game.dark_king_canvas,
            queen:  game.dark_queen_canvas,
            rook:   game.dark_rook_canvas,
            bishop: game.dark_bishop_canvas,
            knight: game.dark_knight_canvas,
            pawn:   game.dark_pawn_canvas,
        };

        ctx.fillStyle = !abandoned ? color : "#000";
        game.draw_rect_of_square(x, y);

        ///*
        ctx.mozImageSmoothingEnabled    = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled     = false;
        ctx.imageSmoothingEnabled       = false;

        ctx.drawImage(
            (piece.player_id == game.me.player_id) ? me_canvases[piece.piece]
            : (abandoned) ? dark_canvases[piece.piece]
            : canvases[piece.piece],
            ((game.bw / game.bs) * x),
            ((game.bw / game.bs) * y),
            (game.bw / game.bs),
            (game.bw / game.bs)
        );
        //*/

        /*
        var pieces = { // unicode points
            king:   9818,
            queen:  9819,
            rook:   9820,
            bishop: 9821,
            knight: 9822,
            pawn:   9823,
        };

        ctx.font =  (game.bw / game.bs) + "px arial";
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = (game.me.player_id != piece.player_id) ? "#fff" : "#222";
        ctx.fillText(String.fromCharCode(pieces[piece.piece]),
            ((game.bw / game.bs) * x) + ((game.bw / game.bs) / 16),
            ((game.bw / game.bs) * y) + (game.bw / game.bs) - (((game.bw / game.bs) / 8))
        );
        */
    },

    draw_rect_of_square: function(x, y)
    {
        ctx.fillRect(((game.bw / game.bs) * x), ((game.bw / game.bs) * y), (game.bw / game.bs), (game.bw / game.bs));
    },

    render: function()
    {
        requestAnimationFrame(game.render);

        stats.begin();

        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, game.bw, game.bh);
        ctx.stroke();

        if(game.server_unavailable) {
            ctx.fillStyle = "#f3f3f3";
            ctx.font = "48px zorque";
            ctx.fillText("Server Unavailable...", game.bw / 2 - (96*3.75), game.bh / 4);
            ctx.font = "24px zorque";
            ctx.fillText("Please wait and refresh", game.bw / 2 - (96*3.75), game.bh / 4 + 60);
        } else if(game.show_error_screen) {
            ctx.fillStyle = "#f3f3f3";
            ctx.font = "48px zorque";
            ctx.fillText("Server Error...", game.bw / 2 - (96*3.75), game.bh / 4);
            ctx.font = "24px zorque";
            ctx.fillText(game.error_msg, game.bw / 2 - (96*3.75), game.bh / 4 + 60);
        } else if(game.show_help) {
            ctx.fillStyle = "#f3f3f3";
            ctx.font = "96px zorque";
            ctx.fillText("MMO Chess", game.bw / 2 - (96*2.75), game.bh / 4);

            ctx.fillStyle = "#f3f3f3";
            ctx.font = "24px zorque";
            ctx.fillText("Controls:", game.bw / 4 - (48*5), game.bh * 0.46);
            ctx.fillText("WASD/RMB: move map", game.bw / 4  - (48*2), game.bh * 0.46 + 30);
            ctx.fillText("WHEEL/N: zoom out", game.bw / 4  - (48*2), game.bh * 0.46 + 60);
            ctx.fillText("WHEEL/M: zoom in", game.bw / 4  - (48*2), game.bh * 0.46 + 90);
            ctx.fillText("H: go to king", game.bw / 4  - (48*2), game.bh * 0.46 + 120);
            ctx.fillText("LMB: select piece", game.bw / 4  - (48*2), game.bh * 0.46 + 150);

            ctx.fillText("Rules:", game.bw * 0.65 - (48*5), game.bh * 0.46);
            ctx.fillText("Take over enemy castles", game.bw * 0.65  - (48*2), game.bh * 0.46 + 30);
            ctx.fillText("by seizing their king", game.bw * 0.65  - (48*2), game.bh * 0.46 + 60);
            ctx.fillText("Make moves every 5 seconds", game.bw * 0.65  - (48*2), game.bh * 0.46 + 90);
            ctx.fillText("Pawns mere meatshields", game.bw * 0.65  - (48*2), game.bh * 0.46 + 120);
        } else if(game.menu) {
            ctx.fillStyle = "#f3f3f3";
            ctx.font = "24px zorque";
            var server_it = 0;
            for(var k in game.servers) {
                if(game.servers.hasOwnProperty(k)) {
                    var server = game.servers[k];
                    ctx.fillText("server " + (server_it + 1) + " ("+server.players+")", 100, 100 + server_it * 100);
                    ctx.strokeStyle = "#222";
                    ctx.strokeRect(50, 50 + server_it * 100, 600, 100);
                    server_it++;
                }
            }
        } else if(game.waiting_to_join) {
            ctx.fillStyle = "#f3f3f3";
            ctx.font = "96px zorque";
            ctx.fillText("Waiting to Join", game.bw / 2 - (96*3.75), game.bh / 4);
        } else {
            ctx.save();
            {
                ctx.translate(game.tx * (game.bw / game.bs), game.ty * (game.bw / game.bs));

                ctx.mozImageSmoothingEnabled = false;
                ctx.webkitImageSmoothingEnabled = false;
                ctx.msImageSmoothingEnabled = false;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(game.grid_canvas, 0, 0, ((game.bw / game.bs) * game.ba), ((game.bw / game.bs) * game.ba));

                ctx.strokeStyle = "black";
                ctx.stroke();

                var bby = Math.floor(Math.min(game.ba, Math.max(0, -game.ty + game.bs)));
                var bbx = Math.floor(Math.min(game.ba, Math.max(0, -game.tx + game.bs)));

                var sy = Math.floor(Math.min(game.ba - 1, Math.max(0, -game.ty)));
                var sx = Math.floor(Math.min(game.ba - 1, Math.max(0, -game.tx)));

                for(var i=0; i<game.last_moves.length; ++i) {
                    var last_move = game.last_moves[i];

                    ctx.fillStyle = "rgba(70, 245, 75, 0.2)";
                    game.draw_rect_of_square(last_move.fromx, last_move.fromy);
                    ctx.fillStyle = "rgba(240, 70, 245, 0.2)";
                    game.draw_rect_of_square(last_move.tox, last_move.toy);
                }

                for(; game.last_moves.length > 0; ) {
                    var last_move = game.last_moves[0];
                    if(last_move.time < +(new Date) - game.last_move_show_time) {
                        game.last_moves.shift();
                    } else {
                        break;
                    }
                }

                for(var y=sy; y<bby; ++y) {
                    for(var x=sx; x<bbx; ++x) {
                        var cell = game.board[y][x];

                        if(cell != null) {
                            game.draw_piece(cell);

                            if(cell.potential_moves != null) {
                                for(var i=0; i<cell.potential_moves.length; ++i) {
                                    game.draw_potential_move(cell.player_id, cell.potential_moves[i].x, cell.potential_moves[i].y);
                                }
                            }
                        }
                    }
                }

                if(game.piece_selected != null) {
                    game.draw_highlighted(game.piece_selected.x, game.piece_selected.y);

                    for(var i=0; i<game.potential_moves.length; ++i) {
                        game.draw_highlighted(game.potential_moves[i].x, game.potential_moves[i].y);
                    }
                }
            }
            ctx.restore();

            if(game.near_king_alert) {
                var as = (game.bw / game.bs);
                ctx.lineWidth = as;
                ctx.strokeStyle = "#C54646";
                ctx.strokeRect(as / 2, as / 2, game.bw-as, game.bh-as);
            }

            if(game.lost) {
                ctx.fillStyle = "#111";
                ctx.font = "48px zorque";
                ctx.fillText("You've been demolished", game.bw / 2 - (48*6), game.bh / 2);

                ctx.fillStyle = "#111";
                ctx.font = "24px zorque";
                ctx.fillText("refresh for new game", game.bw / 2 - (24*5), game.bh *0.66);
            } else {
                var ts = Math.round((game.clen - ((new Date).getTime() - game.me.since)) / 100.0) / 10.0;
                if(ts >= 0.0) {
                    ctx.fillStyle = "#444";
                    ctx.font = "48px zorque";
                    ctx.fillText(ts, 48, game.bh * 0.95);
                } else {
                    ctx.fillStyle = "#222";
                    ctx.font = "48px zorque";
                    ctx.fillText("ready", 48, game.bh * 0.95);
                }
            }
        }

        stats.end();
    },

    regenerate_canvas_items: function()
    {
        game.grid_canvas = document.createElement('canvas');
        game.grid_canvas.width  = game.ba;
        game.grid_canvas.height = game.ba;
        game.grid_canvas_ctx = game.grid_canvas.getContext('2d');

        for(var y = 0; y <= game.ba; ++y) {
            for(var x = 0; x <= game.ba; ++x) {
                game.grid_canvas_ctx.fillStyle = (x + y) % 2 == 0 ? game.board_color_light : game.board_color_dark;
                game.grid_canvas_ctx.fillRect(x, y, 1, 1);
            }
        }

        function create_piece_tile(piece_type, color)
        {
            var pieces = { // unicode points
                king:   9818,
                queen:  9819,
                rook:   9820,
                bishop: 9821,
                knight: 9822,
                pawn:   9823,
            };

            var canvas = document.createElement('canvas');
            canvas.width  = (game.bw / game.bs);
            canvas.height = (game.bw / game.bs);
            var ctx = canvas.getContext('2d');

            ctx.font =  (game.bw / game.bs) + "px arial";
            ctx.fillStyle = color;
            ctx.fillText(String.fromCharCode(pieces[piece_type]),
                ((game.bw / game.bs) / 16),
                (game.bw / game.bs) - (((game.bw / game.bs) / 8))
            );

            return canvas;
        }

        var other_col = "#FFF";
        var me_col = "#222";
        var abandoned_col = "#235";

        game.king_canvas   = create_piece_tile("king", other_col);
        game.queen_canvas  = create_piece_tile("queen", other_col);
        game.rook_canvas   = create_piece_tile("rook", other_col);
        game.bishop_canvas = create_piece_tile("bishop", other_col);
        game.knight_canvas = create_piece_tile("knight", other_col);
        game.pawn_canvas   = create_piece_tile("pawn", other_col);

        game.me_king_canvas   = create_piece_tile("king", me_col);
        game.me_queen_canvas  = create_piece_tile("queen", me_col);
        game.me_rook_canvas   = create_piece_tile("rook", me_col);
        game.me_bishop_canvas = create_piece_tile("bishop", me_col);
        game.me_knight_canvas = create_piece_tile("knight", me_col);
        game.me_pawn_canvas   = create_piece_tile("pawn", me_col);

        game.dark_king_canvas   = create_piece_tile("king", abandoned_col);
        game.dark_queen_canvas  = create_piece_tile("queen", abandoned_col);
        game.dark_rook_canvas   = create_piece_tile("rook", abandoned_col);
        game.dark_bishop_canvas = create_piece_tile("bishop", abandoned_col);
        game.dark_knight_canvas = create_piece_tile("knight", abandoned_col);
        game.dark_pawn_canvas   = create_piece_tile("pawn", abandoned_col);
    }
};

window.addEventListener('resize', resizeCanvas, false);
window.addEventListener('onfocus', resizeCanvas, false);
document.getElementById('game').addEventListener('click', mouseClick, true);
document.getElementById('game').addEventListener('wheel', mouseWheel, true);
window.addEventListener('keydown', keyPress, true);
window.addEventListener('mousedown', startPan, true);
document.oncontextmenu = function() {
    return false;
}

function showsidebox() {
    $('#sidebox').show();
    $('#showsidebox').hide();
    $('#hidesidebox').show();
    $('#chatbox').scrollTop($('#chatbox').prop('scrollHeight'));
}

$('#help').click(function() {
    game.show_help = true;
});

$('#showsidebox').click(function() {
    showsidebox();
});

$('#hidesidebox').click(function() {
    $('#sidebox').hide();
    $('#hidesidebox').hide();
    $('#showsidebox').show();
});

$('#chatsubmit').on('click', function() { game.client.send_message() });

$('#sound_enable_box').click(function() {
    game.sound_enabled = !game.sound_enabled;
    window.localStorage.setItem('sound_enabled', game.sound_enabled);
});


function resizeCanvas()
{
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    game.bw = window.innerWidth;
    game.bh = window.innerHeight;

    game.regenerate_canvas_items();
}


function mouseWheel(e)
{
    e = e || window.event;
    var delta = Math.max(-1, Math.min(1, (e.deltaY || -e.detail)));
    game.zoom(delta*2);
}

function mouseClick(e)
{
    e = e || window.event;

    if(game.show_help) {
        game.show_help = false;
        return;
    }

    if(game.menu) {
        var server_it = 0;
        for(var k in game.servers) {
            if(game.servers.hasOwnProperty(k)) {
                var server = game.servers[k];
                var sy = server_it * 100;

                if(e.clientY > sy && e.clientY < sy + 200) {
                    var host = location.protocol + '//' + location.host.split(':')[0] + ':' + k;
                    game.client.init(host);
                    game.client.start_game();
                    return;
                }
                server_it++;
            }
        }
        return;
    }

    var mx = e.clientX;
    var my = e.clientY;

    var x = Math.floor(((-game.tx * (game.bw / game.bs)) + mx) / (game.bw / game.bs));
    var y = Math.floor(((-game.ty * (game.bw / game.bs)) + my) / (game.bw / game.bs));

    if(    y >= 0 && y < game.board.length && x >= 0 && x < game.board[y].length
        && game.board[y][x] != null
        && game.board[y][x].player_id == game.me.player_id
    ) {
        game.piece_selected = game.board[y][x];
        game.potential_moves = game.gen_potential_moves(game.piece_selected);
    } else {
        if(game.piece_selected && (game.clen - ((new Date).getTime() - game.me.since)) < 0) {
            for(var i=0; i<game.potential_moves.length; ++i) {
                if(game.potential_moves[i].x == x && game.potential_moves[i].y == y) {
                    game.client.move({
                        from: {
                            x: game.piece_selected.x,
                            y: game.piece_selected.y,
                        },
                        to: {
                            x: x,
                            y: y
                        }
                    });

                    game.piece_selected = null;
                }
            }
        }
    }
}

function startPan(e)
{
    e = e || window.event;

    if (e.button != 2) {
		return;
    }

    var x0 = e.screenX,
        y0 = e.screenY;

    function continuePan(e) {
        var x = e.screenX,
            y = e.screenY;

	    game.tx += (x-x0) / game.bs * game.pan_speed;
	    game.ty += (y-y0) / game.bs * game.pan_speed;

        x0 = x;
        y0 = y;
    }

    function stopPan(e) {
        $(window).off('mousemove', continuePan);
        $(window).off('mouseup', stopPan);
    };

    $(window).mousemove(continuePan);
    $(window).mouseup(stopPan);
}

function keyPress(e)
{
    e = e || window.event;

    var k = e.keyCode;
    var ch =  String.fromCharCode(e.keyCode);

    if($('#chattextinput').is(':focus')) {
        if(k == 13) {
            game.client.send_message();
        }

        return;
    }

    if(ch == 'H') {
        game.center();
    } else if(ch == 'A' || k == 37) {
        game.tx++;
    } else if(ch == 'D' || k == 39) {
        game.tx--;
    } else if(ch == 'W' || k == 38) {
        game.ty++;
    } else if(ch == 'S' || k == 40) {
        game.ty--;
    } else if(ch == 'M') {
        game.zoom(-2);
    } else if(ch == 'N') {
        game.zoom(2);
    }
}

if(window.localStorage.getItem('sound_enabled') != null) {
    game.sound_enabled = window.localStorage.getItem('sound_enabled') == 'true';
    if(! game.sound_enabled) {
        $('#sound_enable_box').attr('checked', false);
    }
}

resizeCanvas();

var server_selector = {
    ports: [3080, 3081, 3082, 3083, 3084],
    cons: [],

    listen: function()
    {
        for(var port of this.ports) {
            con = io(location.protocol + '//' + location.host.split(':')[0] + ':' + port, {
                path: '/socket.io',
                'reconnect': false,
                'max reconnection attempts': 1,
                'reconnection': false
            });
            con.Sport = port;

            con.on('stats', function(players) {
                game.servers[this.Sport] = {
                    players: players.length
                };
            });

            this.cons.push(con);
            game.servers[port] = {
                players: 'offline'
            };
        }
    }
};
server_selector.listen();
game.init();


// game.init(location.protocol + '//' + location.host.split(':')[0] + ':3080');
