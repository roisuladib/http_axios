import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const authTokenKey =
   'blabla'; /* Example of a bearer token stored in localStorage */

/* Axios configuration */
const axiosInstance: AxiosInstance = axios.create({
   baseURL: process.env.REACT_APP_API_URL,
});

export const configWithAuthorization: AxiosRequestConfig = {
   _withAuthorization: true,
}; /* This will be used to specify that the request needs to include the auth token */

const withAuthorization = (config: AxiosRequestConfig): boolean => {
   return (
      config.hasOwnProperty('_withAuthorization') && config._withAuthorization
   );
};

const interceptRequest = (request: AxiosRequestConfig): AxiosRequestConfig => {
   if (withAuthorization(request)) {
      const token = localStorage.getItem(authTokenKey);
      if (!!token) {
         request.headers['Authorization'] = `Bearer ${token}`;
      }
   }
   return request;
};

const interceptResponseOnFullfilled = (
   response: AxiosResponse
): Result<any> => {
   return new Result(response.data, null, response.headers);
};

const interceptResponseOnRejected = (error: any): Result<any> => {
   if (
      error.response &&
      error.response.headers['WWW-Authenticate'.toLowerCase()]
   ) {
      /* e.g. WWW-Authenticate : Bearer error="invalid_token", error_description="The token is expired" */
      localStorage.removeItem(authTokenKey);
      window.location.reload();
      return;
   }

   let appError = {};
   let headers = null;
   if (error.response) {
      headers = error.response.headers;
      const { status, data } = error.response;
      switch (status) {
         case Status.BadRequest:
            appError = new BadRequestError(data);
            break;
         case Status.Unauthorized:
            appError = new UnauthorizedError(data);
            break;
         case Status.NotFound:
            appError = new NotFoundError(data);
            break;
         default:
            appError = new AppError(data);
            break;
      }
   } else if (error.request) {
      appError = new AppError(error.request);
   } else {
      appError = new AppError(error.message);
   }
   return new Result(null, appError, headers);
};

axiosInstance.interceptors.request.use(interceptRequest);

axiosInstance.interceptors.response.use(
   interceptResponseOnFullfilled,
   interceptResponseOnRejected
);

const requestConfigFactory = (
   params: AxiosRequestConfig['params'],
   headers: AxiosRequestConfig['headers'],
   withAuthorization = false
): AxiosRequestConfig => {
   const config: AxiosRequestConfig = {};
   if (params) {
      config.params = params;
   }
   if (headers) {
      config.headers = headers;
   }
   if (withAuthorization) {
      config._withAuthorization =
         true; /* This is not defined in AxiosRequestConfig interface */
   }
   return config;
};

/* HttpHelper */
class HttpHelper {
   static async getAsync<T>(
      url: string,
      params?: AxiosRequestConfig['params'],
      requestHeaders?: AxiosRequestConfig['headers'],
      withAuthorization = false
   ): Promise<Result<T>> {
      const config = requestConfigFactory(
         params,
         requestHeaders,
         withAuthorization
      );
      const { payload, error, headers } = await axiosInstance.get<T>(
         url,
         config
      );
      return new Result<T>(payload, error, headers);
   }

   static async postAsync<T>(
      url: string,
      data?: any,
      requestHeaders?: AxiosRequestConfig['headers'],
      withAuthorization = false
   ): Promise<Result<T>> {
      const config = requestConfigFactory(
         null,
         requestHeaders,
         withAuthorization
      );
      const { payload, error, headers } = await axiosInstance.post<T>(
         url,
         data,
         config
      );
      return new Result<T>(payload, error, headers);
   }

   static async putAsync<T>(
      url: string,
      data?: any,
      requestHeaders?: AxiosRequestConfig['headers'],
      withAuthorization = false
   ): Promise<Result<T>> {
      const config = requestConfigFactory(
         null,
         requestHeaders,
         withAuthorization
      );
      const { payload, error, headers } = await axiosInstance.put<T>(
         url,
         data,
         config
      );
      return new Result<T>(payload, error, headers);
   }

   static async deleteAsync<T>(
      url: string,
      requestHeaders?: AxiosRequestConfig['headers'],
      withAuthorization = false
   ): Promise<Result<T>> {
      const config = requestConfigFactory(
         null,
         requestHeaders,
         withAuthorization
      );
      const { payload, error, headers } = await axiosInstance.delete<T>(
         url,
         config
      );
      return new Result<T>(payload, error, headers);
   }
}

export default HttpHelper;

/* Constants */
export const Status = {
   Ok: 200,
   Unassigned: 299,
   BadRequest: 400,
   Unauthorized: 401,
   NotFound: 404,
};

export const Methods = {
   Get: 'GET',
   Post: 'POST',
   Put: 'PUT',
   Delete: 'DELETE',
};

export const Headers = {
   'Accept': 'application/json',
   'Content-Type': 'application/json',
};

export const AuthorizationType = {
   Bearer: 'bearer ',
   Basic: 'basic ',
};

export const Credentials = {
   SameOrigin: 'same-origin' /* default */,
   Include: 'include',
   Omit: 'omit',
};

/* Types */
export class Result<T> {
   constructor(
      public payload: T | null = null,
      public error: AppError | null = null,
      public headers: any = null
   ) {
      this.succeeded = error === null || error === undefined;
   }
   public succeeded: boolean;
}

export class AppError {
   constructor(public body: any = null) {}
}

export class NotFoundError extends AppError {
   constructor(body: any = null) {
      super(body);
   }
}

export class BadRequestError extends AppError {
   constructor(body: any = null) {
      super(body);
   }
}

export class UnauthorizedError extends AppError {
   constructor(body: any = null) {
      super(body);
   }
}
