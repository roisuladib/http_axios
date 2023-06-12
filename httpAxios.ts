import axios from 'axios';
require('dotenv').config();

const authTokenKey =
   'blabla'; /* Example of a bearer token stored in localStorage */

/*Axios configuration*/
const axiosInstance = axios.create({
   baseURL: process.env.REACT_APP_API_URL,
});

export const configWithAuthorization = {
   _withAuthorization: true,
}; /* This will be used to specify that the request need to include the auth token */

const withAuthorization = (config = {}) => {
   return (
      config.hasOwnProperty('_withAuthorization') && config._withAuthorization
   );
};

const interceptRequest = request => {
   if (withAuthorization(request)) {
      const token = localStorage.getItem(authTokenKey);
      if (!!token) {
         request.headers['Authorization'] = `Bearer ${token}`;
      }
   }
   return request;
};

const interceptResponseOnFullfilled = response => {
   return new Result(response.data, null, response.headers);
};

const interceptResponseOnRejected = error => {
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
   return new Result(
      null,
      appError,
      headers
   ); /* Nota : use 'Promise.reject' if you need to get the response in Promise.catch (or try-catch with await syntax)  */
};

axiosInstance.interceptors.request.use(interceptRequest);

axiosInstance.interceptors.response.use(
   interceptResponseOnFullfilled,
   interceptResponseOnRejected
);

const requestConfigFactory = (
   params = null,
   headers = null,
   withAuthorization = false
) => {
   const config = {};
   if (params) {
      config.params = params;
   }
   if (headers) {
      config.headers = params;
   }
   if (withAuthorization) {
      config._withAuthorization =
         true; /* This is not defined in AxiosRequestConfig interface */
   }
   return config;
};

/*HttpHelper*/
class HttpHelper {
   static async getAsync(
      url,
      params = null,
      requestHeaders = null,
      withAuthorization = false
   ) {
      const config = requestConfigFactory(
         params,
         requestHeaders,
         withAuthorization
      );
      const { payload, error, headers } = await axiosInstance.get(url, config);
      return new Result(
         payload,
         error,
         headers
      ); /* This is a hack, because axions cannot infer the type returned from interceptors. */
   }

   static async postAsync(
      url,
      data = null,
      requestHeaders = null,
      withAuthorization = false
   ) {
      const config = requestConfigFactory(
         null,
         requestHeaders,
         withAuthorization
      );
      const { payload, error, headers } = await axiosInstance.post(
         url,
         data,
         config
      );
      return new Result(payload, error, headers);
   }

   static async putAsync(
      url,
      data = null,
      requestHeaders = null,
      withAuthorization = false
   ) {
      const config = requestConfigFactory(
         null,
         requestHeaders,
         withAuthorization
      );
      const { payload, error, headers } = await axiosInstance.put(
         url,
         data,
         config
      );
      return new Result(payload, error, headers);
   }

   static async deleteAsync(
      url,
      requestHeaders = null,
      withAuthorization = false
   ) {
      const config = requestConfigFactory(
         null,
         requestHeaders,
         withAuthorization
      );
      const { payload, error, headers } = await axiosInstance.delete(
         url,
         config
      );
      return new Result(payload, error, headers);
   }
}

export default HttpHelper;

/*Constants*/
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

/*Types*/
export class Result {
   constructor(payload = null, error = null, headers = null) {
      this.succeeded = error === null || error === undefined;
      this.payload = payload;
      this.error = error;
      this.headers = headers;
   }
   succeeded;
   payload;
   error; /* AppError : check using 'instanceof' to get the status */
   headers;
}

export class AppError {
   constructor(body = null) {
      this.body = body;
   }
}

export class NotFoundError extends AppError {
   constructor(body = null) {
      super(body);
   }
}

export class BadRequestError extends AppError {
   constructor(body = null) {
      super(body);
   }
}

export class UnauthorizedError extends AppError {
   constructor(body = null) {
      super(body);
   }
}
