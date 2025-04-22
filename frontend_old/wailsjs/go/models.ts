export namespace sql {
	
	export class NullString {
	    String: string;
	    Valid: boolean;
	
	    static createFrom(source: any = {}) {
	        return new NullString(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.String = source["String"];
	        this.Valid = source["Valid"];
	    }
	}

}

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
	    trimester: string;
	
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
	export class Event {
	    event_id: number;
	    name: string;
	    description: string;
	    // Go type: time
	    start_date: any;
	    // Go type: time
	    end_date: any;
	    color: string;
	
	    static createFrom(source: any = {}) {
	        return new Event(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.event_id = source["event_id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.start_date = this.convertValues(source["start_date"], null);
	        this.end_date = this.convertValues(source["end_date"], null);
	        this.color = source["color"];
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
	export class LocalAbsences {
	    course_name: string;
	    date: string;
	    justified: boolean;
	    trimester_name: string;
	    year: string;
	
	    static createFrom(source: any = {}) {
	        return new LocalAbsences(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.course_name = source["course_name"];
	        this.date = source["date"];
	        this.justified = source["justified"];
	        this.trimester_name = source["trimester_name"];
	        this.year = source["year"];
	    }
	}
	export class LocalRoom {
	    room_id: number;
	    name: sql.NullString;
	    campus: sql.NullString;
	    color?: sql.NullString;
	
	    static createFrom(source: any = {}) {
	        return new LocalRoom(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.room_id = source["room_id"];
	        this.name = this.convertValues(source["name"], sql.NullString);
	        this.campus = this.convertValues(source["campus"], sql.NullString);
	        this.color = this.convertValues(source["color"], sql.NullString);
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
	export class LocalGrades {
	    bonus: number;
	    coef: string;
	    course: string;
	    ects: string;
	    exam?: number;
	    grades: number[];
	    trimester: number;
	    year: number;
	    teacher_name: string;
	
	    static createFrom(source: any = {}) {
	        return new LocalGrades(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.bonus = source["bonus"];
	        this.coef = source["coef"];
	        this.course = source["course"];
	        this.ects = source["ects"];
	        this.exam = source["exam"];
	        this.grades = source["grades"];
	        this.trimester = source["trimester"];
	        this.year = source["year"];
	        this.teacher_name = source["teacher_name"];
	    }
	}
	
	
	export class UserSettings {
	    ID: number;
	    Username: string;
	    Password: string;
	    Theme: string;
	    EULA: boolean;
	    Year: string;
	
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
	        this.Year = source["Year"];
	    }
	}

}

