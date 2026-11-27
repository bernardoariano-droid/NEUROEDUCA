import serverless from 'serverless-http';
import app from '../server';

const expressApp: any = typeof app === 'function' ? app : (app as any)?.default || (app as any)?.app;
const serverlessHandler = serverless(expressApp);

export const handler = async (event: any, context: any) => {
  if (event && typeof event.path === 'string') {
    if (event.path.startsWith('/.netlify/functions/api')) {
      const rest = event.path.slice('/.netlify/functions/api'.length);
      event.path = `/api${rest.startsWith('/') ? rest : rest ? `/${rest}` : ''}`;
    }
  }
  return serverlessHandler(event, context);
};
