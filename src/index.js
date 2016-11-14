import {IManagerService, ICommand} from 'odss-api';

let cmds = [{
    name: 'config:set',
    man: 'config:set <name> <value>',
    description: 'Set property',
    execute: function(args, out) {
        console.log('config:set(%s, %s)', args[0], args[1]);
        this.manager.setProperty(args[0], args[1]);
    }
}, {
    name: 'config:list',
    man: 'config:list',
    description: 'Properties list',
    execute: function(args, out) {
        console.log('config:list');
        let stringify = function(obj) {
            if (typeof obj === 'function') {
                return obj.valueOf();
            }
            return obj + '';
        };
        let props = this.manager.getProperties();
        print(props);
        let s = '';
        for (let name in props) {
            s += name + ' = ' + stringify(props[name]) + '\n';
        }
        out(s);
    }
}];

class Command extends ICommand{
    constructor(manager, params) {
        super();
        ICommand.extendProperty(this, params);
        this.manager = manager;
    }
}

class Tracker{
    constructor(ctx) {

        let props = ctx.framework.properties();

        let services = [];
        let add = function(service) {
            services.push(service);
            service.updated(props);
        };
        let remove = function(reference) {
            services.remove(reference);
        };
        this.getProperties = function() {
            return ctx.framework.properties();
        };
        this.update = function(name, value) {
            if (name in props || props[name] !== value) {
                for (let i = 0; i < services.length; i++) {
                    services[i].updated(props);
                }
            }
        };
        this.close = function() {
            tracker.close();
        };
        let tracker = ctx.services.tracker(IManagerService, {
            addingService: function(reference, service) {
                add(service);
            },
            removedService: function(reference, service) {
                remove(service);
            }
        });
        tracker.open();
    }
}

class Manager{
    constructor(tracker) {
        this.tracker = tracker;
    }
    setProperty(name, value) {
        this.tracker.update(name, value);
    }
    getProperties() {
        return this.tracker.getProperties();
    }
}

let tracker;
let manager;

export function start(ctx) {
    tracker = new Tracker(ctx);
    manager = new Manager(tracker);
    for (let i = 0; i < cmds.length; i++) {
        ctx.services.register(ICommand, new Command(manager, cmds[i]));
    }
}
export function stop(ctx) {
    tracker.close();
    tracker = null;
    manager = null;
}
