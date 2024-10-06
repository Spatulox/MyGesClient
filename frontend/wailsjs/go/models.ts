export namespace structures {
	
	export class Teacher {
	    teacher_id: number;
	    teacher: string;
	
	    static createFrom(source: any = {}) {
	        return new Teacher(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.teacher_id = source["teacher_id"];
	        this.teacher = source["teacher"];
	    }
	}
	export class Discipline {
	    Teacher: Teacher;
	    coef?: number;
	    trimester: number;
	
	    static createFrom(source: any = {}) {
	        return new Discipline(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Teacher = this.convertValues(source["Teacher"], Teacher);
	        this.coef = source["coef"];
	        this.trimester = source["trimester"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Grades {
	    Discipline: string;
	    Notes: number[];
	
	    static createFrom(source: any = {}) {
	        return new Grades(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Discipline = source["Discipline"];
	        this.Notes = source["Notes"];
	    }
	}
	export class LocalRoom {
	    room_id: number;
	    name: string;
	    campus: string;
	    color?: string;
	
	    static createFrom(source: any = {}) {
	        return new LocalRoom(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.room_id = source["room_id"];
	        this.name = source["name"];
	        this.campus = source["campus"];
	        this.color = source["color"];
	    }
	}
	export class LocalAgenda {
	    agenda_id: number;
	    agenda_name: string;
	    type: string;
	    modality: string;
	    start_date: string;
	    end_date: string;
	    comment: string;
	    room: LocalRoom;
	    discipline: Discipline;
	
	    static createFrom(source: any = {}) {
	        return new LocalAgenda(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.agenda_id = source["agenda_id"];
	        this.agenda_name = source["agenda_name"];
	        this.type = source["type"];
	        this.modality = source["modality"];
	        this.start_date = source["start_date"];
	        this.end_date = source["end_date"];
	        this.comment = source["comment"];
	        this.room = this.convertValues(source["room"], LocalRoom);
	        this.discipline = this.convertValues(source["discipline"], Discipline);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class UserSettings {
	    ID: number;
	    Username: string;
	    Password: string;
	    Theme: string;
	    EULA: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UserSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Username = source["Username"];
	        this.Password = source["Password"];
	        this.Theme = source["Theme"];
	        this.EULA = source["EULA"];
	    }
	}

}

