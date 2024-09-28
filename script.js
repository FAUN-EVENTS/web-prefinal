const INTERNALS = {
    CTX: {
        EL: document.body,
        X_MIN: function() {
            return 150;
        },
        X_MAX: function() {
            return window.innerWidth - 200;
        },
        Y_MIN: function() {
            return 150;
        },
        Y_MAX: function() {
            return window.innerHeight - 240;
        } 
    },
    LATI_CTX: document.getElementById("lati"),
    SOUND: {
		STEP: new Audio('assets/sounds/snow-step-1-81064.mp3'),
		BEH: new Audio('assets/sounds/goat-sound-177346.mp3'),
        HIT: new Audio('assets/sounds/bamboo-hit-sound-effect.mp3'),
        LEVEL_CLEARED: new Audio('assets/sounds/success-fanfare-trumpets-6185.mp3'),
        RESET: new Audio('assets/sounds/magic-spell.mp3')
    }
};

const Game = {

    init: function() {

        let player = this.player.init(new this.entity(INTERNALS.LATI_CTX, "assets/images/lati.gif", "player"));
        player.pos.x = 210;
        player.pos.y = 210;
        player.display();

        document.addEventListener("keydown", (e) => {

            const dir = (e.key.match(/(?<=^Arrow)\w+/)||[])[0];
            const fight = e.key == " ";

            if(dir) {

                e.preventDefault(); // Prevent Browser scroll if overflow
                let pos = player.pos;
                let scaleX = 1;
                ({
                  Left:  () => {
                    pos.x -= 35;
                    scaleX = -1;
                },
                  Right: () => {
                    pos.x += 35
                    scaleX = 1;
                },
                  Up:    () => pos.y -= 35,
                  Down:  () => pos.y += 35,
                }[dir])(); 


                if (pos.x < INTERNALS.CTX.X_MIN()) {
                    pos.x = INTERNALS.CTX.X_MIN();
                    INTERNALS.SOUND.BEH.play();
                }
                else if(pos.x > INTERNALS.CTX.X_MAX()) {
                    pos.x = INTERNALS.CTX.X_MAX();
                    INTERNALS.SOUND.BEH.play();
                }
                else if(pos.y < INTERNALS.CTX.Y_MIN()) {
                    pos.y = INTERNALS.CTX.Y_MIN();
                    INTERNALS.SOUND.BEH.play();
                }
                else if(pos.y > INTERNALS.CTX.Y_MAX()) {
                    pos.y = INTERNALS.CTX.Y_MAX();
                    INTERNALS.SOUND.BEH.play();
                }
                else {
                    INTERNALS.SOUND.STEP.play();
                }

                this.player.get().move(pos.x, pos.y, scaleX);
                this.enemy.watch_entity(player);

            }
            else if(fight) {
                this.enemy.fight(player);
            }
            else {
                return;
            }
          

        });

        document.addEventListener("levelCleared", function(e) {
            
            let clearance_modal = document.getElementById("levelCleared");
            clearance_modal.style.display = "block";

            if(e.detail.sound === true)
                INTERNALS.SOUND.LEVEL_CLEARED.play();
            
            localStorage.setItem("lmd.levelCleared", true);

            setTimeout(function() {
                clearance_modal.style.display = "none";
            }, 4000);
        });

        let restored = this.restore();
        if(restored.length < 1){
            for(let i = 0; i < (3 - restored + 1); i++) {
                this.enemy.spawn_random();
            }
        }
        if(localStorage.getItem("lmd.levelCleared") === "true") {
            document.dispatchEvent(new CustomEvent("levelCleared", {detail: {sound: false}}));
        }
    },
    restore: function() {

        let restored = [];
        let st_len = localStorage.length;
        for (let i = 0; i < st_len; i++) {
            if (localStorage.key(i).indexOf("lmd.entity.enemy-") !== -1) {
                let src = JSON.parse(localStorage.getItem(localStorage.key(i)));
                let item = Object.assign(new this.entity, src);
                item.create_ctx_spawn();
                this.enemy.ingame.push(item);
                restored.push(item);
            }
        }

        return restored;
    },
    reset: function() {
        while(localStorage.length > 0) {
            let key = localStorage.key(0);
            if (key.indexOf("lmd.") !== -1) {
                localStorage.removeItem(key);
            }
        }

        INTERNALS.SOUND.RESET.play();
        setTimeout(function() {
            location.reload();
        }, 2000);
    },
    generateUid() {
        return Math.random().toString(16).slice(2);
    },
    resize: function() {

        if(Game.player.inner === undefined) return;

        let entities = [Game.player.inner];
        for(enemy of Game.enemy.ingame) {
            entities.push(enemy);
        }

        for(entity of entities) {

            let x = entity.pos.x;
            let y = entity.pos.y;
            if(entity.pos.x > INTERNALS.CTX.X_MAX()) {
                x = INTERNALS.CTX.X_MAX();
            }
            if (entity.pos.y > INTERNALS.CTX.Y_MAX()) {
                y = INTERNALS.CTX.Y_MAX();
            }
    
            entity.move(x, y);
        }
    },
    entity: class Entity {
        constructor(ctx, sprite, uid) {
            this.uid = uid;
            this.ctx = ctx;
            this.sprite = sprite;
            this.width = 80;
            this.height = 80;
            this.pos = {x: 0, y: 0, scaleX: 1};
            this.hearts = 3;
            this.heavenized = false;

            this.save();
        }
        save() {
            localStorage.setItem("lmd.entity."+this.uid, JSON.stringify(this));
        }
        move(newX, newY, scaleX) {

            if(scaleX === -1 || scaleX === 1) {
                this.pos.scaleX = scaleX;
            }
            this.pos.x = newX;
            this.pos.y = newY;

            this.ctx.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) scaleX(${this.pos.scaleX})`;
            this.save();
        }
        display() {
            let ctx = this.ctx;
            ctx.src = this.sprite;

            ctx.style.zIndex = "10";
            
            ctx.style.width = this.width;
            ctx.style.height = this.height;

            ctx.style.position = "fixed";

            this.move(this.pos.x, this.pos.y, this.pos.scaleX);
            this.save();
        }
        resetAnimation() {
            if (this.ctx.style.animation != "") {
                this.ctx.style.animation = "";
            }
            this.save();
        }
        hit() {
            if(this.heavenized) return;

            // Play hit animation
            enemy.ctx.style.animation = 'none';
            enemy.ctx.offsetHeight; /* trigger reflow */
            enemy.ctx.style.animation = null;
            enemy.ctx.style.animation = 'damage 1s 1';

            INTERNALS.SOUND.HIT.currentTime = 0;
            INTERNALS.SOUND.HIT.play();

            this.hearts -= 1;
            if (this.hearts <= 0 ){
                this.hearts = 0;
                this.heavenize();
            }
            this.save();
        }
        heavenize() {
            if(this.heavenized) return;

            this.heavenized = true;
            this.ctx.style.animation = "heavenize 1s 1";

            setTimeout(() => {
                this.sprite = 'assets/images/gravestone.png';
                this.move(this.pos.x, this.pos.y, 1);
                this.ctx.style.height = "50px";
                this.ctx.style.width = "auto";
                this.display();
            }, 1000);
            this.save();
        }
        create_ctx_spawn() {

            let ctx = document.createElement("img");
            document.body.insertBefore(ctx, INTERNALS.LATI_CTX);
            this.ctx = ctx;
            this.display();

            return this;
        }

        /**
         * 
         * @param {Entity} obj1 
         * @param {Entity} obj2 
         */
        static does_collide(obj1, obj2) {

            const obj1_x_min = obj1.pos.x;
            const obj1_x_max = obj1.pos.x + obj1.width;
            const obj1_y_min = obj1.pos.y;
            const obj1_y_max = obj1.pos.y + obj1.height;
            
            const obj2_x_min = obj2.pos.x;
            const obj2_x_max = obj2.pos.x + obj2.width;
            const obj2_y_min = obj2.pos.y;
            const obj2_y_max = obj2.pos.y + obj2.height;
            
            const collide_x = (obj1_x_min - obj2_x_min > 0 && obj1_x_min - obj2_x_max < 0) || (obj1_x_max - obj2_x_min > 0 && obj1_x_max - obj2_x_max < 0);
            const collide_y = (obj1_y_min - obj2_y_min > 0 && obj1_y_min - obj2_y_max < 0) || (obj1_y_max - obj2_y_min > 0 && obj1_y_max - obj2_y_max < 0);

            return collide_x && collide_y;
        }
    },
    player: {
        inner: undefined,
        init: function(with_entity) {
            this.inner = with_entity;
            return this.inner;
        },
        get: function() {
            return this.inner;
        },
        get_ctx: function() {
            return this.inner.ctx;
        }
    },
    enemy: {
        sprites: [
            "./assets/images/crane-de-feu.gif",
            "./assets/images/squelette.gif",
            "./assets/images/vampire.gif"
        ],
        ingame: [],
        get_random_int: (min, max) => {
            return min + Math.round(Math.random() * (max - min))
        },
        spawn(x, y) {

            let ctx = document.createElement("img");
            document.body.insertBefore(ctx, INTERNALS.LATI_CTX);

            let enemy = new Game.entity(ctx, this.sprites[this.get_random_int(0, this.sprites.length-1)], "enemy-"+Game.generateUid());
            enemy.ctx.id = enemy.uid;

            enemy.pos = {
                x: x,
                y: y,
                scaleX: -1
            };
            this.ingame.push(enemy);

            enemy.display();

            return enemy;
        },
        spawn_random: function() {
            return this.spawn(
                this.get_random_int(INTERNALS.CTX.X_MIN(), INTERNALS.CTX.X_MAX()),
                this.get_random_int(INTERNALS.CTX.Y_MIN(), INTERNALS.CTX.Y_MAX())
            );
        },
        /**
         * 
         * @param {Entity} entity 
         */
        fight: function(entity) {

            let heavenized = 0;
            for (enemy of this.ingame) {

                if(!enemy.heavenized) {
                    if (Game.entity.does_collide(entity, enemy)) {
                        enemy.hit();
                    }
                    else {
                        enemy.resetAnimation();
                    }
                }

                if(enemy.heavenized) {
                    heavenized++;
                    continue;
                }
            }

            if(heavenized === this.ingame.length) {
                document.dispatchEvent(new CustomEvent("levelCleared", {detail: {sound: true}}));
            }
        },
        watch_entity: function(entity) {
            let x_ref = entity.pos.x;
            for (enemy of this.ingame) {
                if(enemy.heavenized) continue;

                if(enemy.pos.x < x_ref) {
                    enemy.move(enemy.pos.x, enemy.pos.y, 1);
                }
                else {
                    enemy.move(enemy.pos.x, enemy.pos.y, -1);
                }
            }
        }
    }
}

Game.init();

function resetGame() {
    Game.reset();
}