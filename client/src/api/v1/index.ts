import axios, { AxiosInstance } from "axios";

export default class ServerApi {
  api: AxiosInstance;

  constructor() {
    this.api = axios.create({ baseURL: `api/v1` });
  }

  async post(path: string, form: any) {
    try {
      const response = await this.api.post(path, form);
      return { response: response };
    } catch (error: any) {
      return { error: error };
    }
  }

  async signUp(form: {
    email: string;
    userName: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    return await this.post("/users/signup", form);
  }

  async signIn(form: { userName: string; password: string }) {
    return await this.post("/users/signin", form);
  }
}
