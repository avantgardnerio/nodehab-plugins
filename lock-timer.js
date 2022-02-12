module.exports = class LockTimer {
    constructor(driver, config, webPush, db) {
        this.driver = driver;
        this.config = config;
        this.webPush = webPush;
        this.db = db;
        this.timeout = undefined;
        this.notifyThreshold = 5 * 60;

        const frontLockId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === 'Front lock'));
        const frontDoorId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === 'Front door'));
        this.frontLock = driver.controller.nodes.get(frontLockId);
        this.frontDoor = driver.controller.nodes.get(webPush);

        console.log(`frontLockId=${frontLockId} frontDoorId=${frontDoorId}`);
    }

    async init() {
        this.boltStatus = await this.frontLock.getValue({ commandClass: 98, property: 'boltStatus' });
    }

    async valueUpdated(node, args) {
        if(node.nodeId !== this.frontLock.nodeId) return;
        if(args.commandClass !== 98) return;
        if(args.property !== "boltStatus") return;

        await this.update(args.newValue);
    }

    async update(boltStatus) {
        if(this.boltStatus === boltStatus) return;
        this.boltStatus = boltStatus;
        if(boltStatus === 'locked') {
            if(this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = undefined;
            }
            return; // Don't care
        }

        // notify subscribers
        this.timeout = setTimeout(async () => {
            const subscriptions = await this.db.many('select * from subscriptions');
            for(let subscription of subscriptions) {
                try {
                    const msg = `Front lock has been ${boltStatus} for ${this.notifyThreshold} seconds`;
                    console.log(`Notifying subscription ${subscription.id} ${msg}`);
                    await this.webPush.sendNotification(subscription.subscription, msg);
                } catch(ex) {
                    console.error(`Error pushing notification: ${ex.statusCode}`, ex);
                    if(ex.statusCode >= 400 && ex.statusCode < 500) {
                        console.warn(`Removing dead subscription ${subscription.id}...`);
                        await this.db.none(`delete from subscriptions where id=$1`, [subscription.id]);
                    }
                }
            }
        }, this.notifyThreshold * 1000);
    }
}

