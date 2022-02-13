const notifyThreshold = 5 * 60;
const commandClass = 102;
const doorName = 'Garage door';
const property = `currentState`;

module.exports = async (driver, config, notify) => {
    let timeout;
    let currentState;

    const deviceId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === doorName));
    const device = driver.controller.nodes.get(deviceId);
    console.log(`garageDoorId=${deviceId}`);

    const update = async (newState) => {
        currentState = newState;
        if(currentState === 0) { // 0=closed
            if(timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
            return; // Don't care
        }
        timeout = setTimeout(async () => {
            await notify(`${doorName} has been open for ${notifyThreshold} seconds`);
        }, notifyThreshold * 1000);
    }
    await update(await device.getValue({ commandClass, property }));

    return {
        valueUpdated: async (node, args) => {
            if(node.nodeId !== device.nodeId || args.commandClass !== commandClass || args.property !== property) return;
            await update(args.newValue);
        }    
    }
}

