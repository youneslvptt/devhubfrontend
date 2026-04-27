import { Route as rootRouteImport } from './routes/__root';
import { Route as LoginRouteImport } from './routes/login';
import { Route as ChatRouteImport } from './routes/chat';
import { Route as AdminRouteImport } from './routes/admin';
import { Route as IndexRouteImport } from './routes/index';
import { Route as ChangePasswordRouteImport } from './routes/changePassword';

const LoginRoute = LoginRouteImport.update({
    id: '/login',
    path: '/login',
    getParentRoute: () => rootRouteImport,
});
const ChatRoute = ChatRouteImport.update({
    id: '/chat',
    path: '/chat',
    getParentRoute: () => rootRouteImport,
});
const AdminRoute = AdminRouteImport.update({
    id: '/admin',
    path: '/admin',
    getParentRoute: () => rootRouteImport,
});
const IndexRoute = IndexRouteImport.update({
    id: '/',
    path: '/',
    getParentRoute: () => rootRouteImport,
});
const ChangePasswordRoute = ChangePasswordRouteImport.update({
    id: '/changePassword',
    path: '/changePassword',
    getParentRoute: () => rootRouteImport,
});

const rootRouteChildren = {
    IndexRoute: IndexRoute,
    AdminRoute: AdminRoute,
    ChatRoute: ChatRoute,
    LoginRoute: LoginRoute,
    ChangePasswordRoute: ChangePasswordRoute,   // ✅ Added
};

export const routeTree = rootRouteImport
    ._addFileChildren(rootRouteChildren)
    ._addFileTypes();