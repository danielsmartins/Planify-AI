import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_key_planify');

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
  
  // Liberar rotas da api webhook e arquivos estáticos
  if (request.nextUrl.pathname.startsWith('/api') || request.nextUrl.pathname.includes('.')) {
    return NextResponse.next();
  }

  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session) {
    try {
      await jwtVerify(session, secretKey, { algorithms: ['HS256'] });
      if (isAuthPage) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (err) {
      if (!isAuthPage) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
