module.exports = class GarageDoorTimer {
    constructor(driver, config, webPush, db) {
        this.driver = driver;
        this.config = config;
        this.webPush = webPush;
        this.db = db;
        this.timeout = undefined;
        this.notifyThreshold = 5 * 60;
        this.currentState = undefined;

        const deviceId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === 'Garage door'));
        this.device = driver.controller.nodes.get(deviceId);

        console.log(`garageDoorId=${deviceId}`);
    }

    async init() {
        const currentState = await this.device.getValue({ commandClass: 102, property: 'currentState' });
        console.log(`Garage state is ${currentState}`);
        await this.update(currentState);
    }

    async valueUpdated(node, args) {
        if(node.nodeId !== this.device.nodeId) return;
        if(args.commandClass !== 102) return;
        if(args.property !== "currentState") return;

        await this.update(args.newValue);
    }

    async update(currentState) {
        this.currentState = currentState;
        if(currentState === 0) { // 0=closed
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
                    const msg = `Garage door has been open for ${this.notifyThreshold} seconds`;
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

