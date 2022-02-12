module.exports = class LockTimer {
    constructor(driver, config, notify, db) {
        this.driver = driver;
        this.config = config;
        this.notify = notify;
        this.db = db;
        this.timeout = undefined;
        this.notifyThreshold = 5 * 60;

        const frontLockId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === 'Front lock'));
        const frontDoorId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === 'Front door'));
        this.frontLock = driver.controller.nodes.get(frontLockId);
        this.frontDoor = driver.controller.nodes.get(frontDoorId);

        console.log(`frontLockId=${frontLockId} frontDoorId=${frontDoorId}`);
    }

    async init() {
        const boltStatus = await this.frontLock.getValue({ commandClass: 98, property: 'boltStatus' });
        this.update(boltStatus);
    }

    async valueUpdated(node, args) {
        if(node.nodeId !== this.frontLock.nodeId) return;
        if(args.commandClass !== 98) return;
        if(args.property !== "boltStatus") return;

        await this.update(args.newValue);
    }

    async update(boltStatus) {
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
            const msg = `Front lock has been ${boltStatus} for ${this.notifyThreshold} seconds`;
            await this.notify(msg);
        }, this.notifyThreshold * 1000);
    }
}

