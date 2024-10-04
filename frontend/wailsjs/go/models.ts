export namespace db {
	
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

