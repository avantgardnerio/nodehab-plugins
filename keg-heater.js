module.exports = class KegHeater {
    constructor(driver, config, webPush) {
        this.driver = driver;
        this.config = config;
        this.webPush = webPush;

        const sensorId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === 'Keg sensor'));
        const heaterId = parseInt(Object.keys(config.nodes).find(k => config.nodes[k] === 'Keg heater'));
        this.sensor = driver.controller.nodes.get(sensorId);
        this.heater = driver.controller.nodes.get(heaterId);

        console.log(`Keg sensor=${sensorId} heater=${heaterId}`);
    }

    async init() {
        const temp = await this.sensor.getValue({ commandClass: 49, property: 'Air temperature' });
        await this.update(temp);
    }

    async valueUpdated(node, args) {
        if(node.nodeId !== this.sensor.nodeId) return;
        if(args.commandClass !== 49) return;
        if(args.property !== "Air temperature") return;

        await this.update(args.newValue);
    }

    async update(temp) {
        const heating = await this.heater.getValue({ commandClass: 37, property: 'currentValue' });
        console.log(`Keg temp=${temp} heating=${heating}`);
        if(heating === false && temp < 32) {
            await this.heater.setValue({ commandClass: 37, property: 'targetValue' }, true);
            console.log(`Turned on keg heat`);
        }
        if(heating === true && temp > 36) {
            await this.heater.setValue({ commandClass: 37, property: 'targetValue' }, false);
            console.log(`Turned off keg heat`);
        }
    }
}

