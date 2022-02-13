const notifyThreshold = 5 * 60;
const commandClass = 98;
const property = `boltStatus`;
const lockName = 'Front lock';
const doorName = 'Front door';

module.exports = async (driver, config, notify) => {
    let timeout;
    let currentState;
    
    const frontLockId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === lockName));
    const frontDoorId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === doorName));
    const frontLock = driver.controller.nodes.get(frontLockId);
    const frontDoor = driver.controller.nodes.get(frontDoorId);
    console.log(`frontLockId=${frontLockId} frontDoorId=${frontDoorId}`);

    const update = async (newState) => {
        currentState = newState;
        if(currentState === 'locked') {
            if(timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
            return; // Don't care
        }
        timeout = setTimeout(async () => {
            await notify(`Front lock has been ${currentState} for ${notifyThreshold} seconds`);
        }, notifyThreshold * 1000);
    };
    update(await frontLock.getValue({ commandClass, property }));

    return {
        valueUpdated: async (node, args) => {
            if(node.nodeId !== frontLock.nodeId || args.commandClass !== commandClass || args.property !== property) return;
            await update(args.newValue);
        },
    }
}

