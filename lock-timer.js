const commandClass = 98;
const property = `boltStatus`;

module.exports = async (driver, config, notify, db, opts) => {
    let timeout;
    let currentState;
    
    const frontLockId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === opts.lockName));
    const frontDoorId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === opts.doorName));
    const frontLock = driver.controller.nodes.get(frontLockId);
    const frontDoor = driver.controller.nodes.get(frontDoorId);
    console.log(`${opts.lockName}=${frontLockId} ${opts.doorName}=${frontDoorId}`);

    const update = async (newState) => {
        currentState = newState;
        if(currentState === 'locked') {
            if(timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
            return; // Don't care
        }
        timeout = timeout || setTimeout(async () => {
            await notify(`${opts.lockName} has been ${currentState} for ${opts.notifyThreshold} seconds`);
            timeout = undefined;
        }, opts.notifyThreshold * 1000);
    };
    update(await frontLock.getValue({ commandClass, property }));

    return {
        valueUpdated: async (node, args) => {
            if(node.nodeId !== frontLock.nodeId || args.commandClass !== commandClass || args.property !== property) return;
            await update(args.newValue);
        },
    }
}

