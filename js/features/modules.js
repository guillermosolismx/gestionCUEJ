// Eliminar las importaciones que causan el error
// import moduleA from './moduleA';
// import moduleB from './moduleB';

// Implementar la funcionalidad de módulos directamente
class ModuleManager {
    constructor() {
        this.modules = [];
    }

    createModule(startDate, endDate, timeSlots = []) {
        return {
            id: crypto.randomUUID(),
            startDate,
            endDate,
            timeSlots
        };
    }

    addTimeSlot(moduleId, timeSlot) {
        const module = this.modules.find(m => m.id === moduleId);
        if (module) {
            module.timeSlots.push(timeSlot);
        }
    }

    removeTimeSlot(moduleId, timeSlotId) {
        const module = this.modules.find(m => m.id === moduleId);
        if (module) {
            module.timeSlots = module.timeSlots.filter(ts => ts.id !== timeSlotId);
        }
    }
}

// Exportar la clase ModuleManager
export const moduleManager = new ModuleManager();
