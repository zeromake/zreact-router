import {
    h,
    Component,
    PureComponent,
    Children,
    findChildren,
    findProps,
    findNodeType,
    cloneElement,
} from "react-import";

import {
    createRoute,
} from "./tools";

import {
    BaseContext,
} from "./context";

import {
    pick,
    resolve,
} from "./lib/utils";

import {
    Location,
} from "./location";

import {
    FocusHandler,
} from "./focus";

import {
    Redirect,
} from "./redirect";

interface IRouteImplProps {
    location: any;
    navigate: any;
    basepath: string;
    baseuri: string;
    component: string | Component<any, any>;
    primary?: boolean;
    children?: any;
    [name: string]: any;
}

export function Route(props: any) {
    const { component, ...domProps } = props;
    return h(component, domProps);
}

function isRoute(child: any): boolean {
    const props = findProps(child);
    const nodeType = findNodeType(child);
    return nodeType === Route || nodeType === Redirect || props.default || props.path;
}

export class RouteImpl extends PureComponent<IRouteImplProps, any> {
    public static defaultProps = {
        primary: true,
        basepath: "/",
    };
    public state: any;
    public props: IRouteImplProps;
    public context: any;
    public linkState: any;
    public setState: any;
    public forceUpdate: any;
    public refs: any;
    private handleChildren(children, handleRouteChildren) {
        if (children == null || children.length === 0) {
            return children;
        }
        const newChildren = [];
        for (let i = 0, len = children.length; i < len; i ++) {
            const child = children[i];
            if (child == null) {
                continue;
            }
            if (isRoute(child)) {
                return handleRouteChildren(children);
            }

            const deepChild = Children.toArray(findChildren(child));
            if (deepChild && deepChild.length > 0) {
                newChildren.push(
                    cloneElement(
                        child,
                        null,
                        this.handleChildren(
                            deepChild,
                            handleRouteChildren,
                        ),
                    ),
                );
            } else {
                newChildren.push(child);
            }
        }
        return newChildren;
    }
    public render() {
        const {
            location,
            navigate,
            primary,
            children,
            baseuri,
            component = "div",
            ...domProps } = this.props;
        const pathname = location.pathname;
        let basepath = this.props.basepath;
        let uri = null;
        const defaultBasePath = basepath;

        function handleRouteChildren(routeChildren) {
            basepath = defaultBasePath;
            const routes = Children.map(routeChildren, createRoute(basepath));
            const match = pick(routes, pathname);
            if (match) {
                const {
                    params,
                    route,
                } = match;
                uri = match.uri;
                const element = route.value;
                basepath = route.default ? basepath : route.path.replace(/\*$/, "");
                const props = {
                    params,
                    uri,
                    location,
                    navigate: (to, options) => navigate(
                        resolve(to, uri),
                        options,
                    ),
                };
                const child = Children.toArray(findChildren(element));
                return [cloneElement(
                    element,
                    props,
                    child.length > 0 ? (
                      <DRouter primary={primary}>{child}</DRouter>
                    ) : null,
                )];
            }
            return null;
        }
        const cloneChildren =  this.handleChildren(Children.toArray(children), handleRouteChildren);
        if (cloneChildren && cloneChildren.length > 0) {
            const FocusWrapper = primary ? FocusHandler : component;
            const wrapperProps = primary
                ? { uri, location, component, ...domProps }
                : domProps;
            return (
                <BaseContext.Provider value={{ baseuri: uri, basepath }}>
                    <FocusWrapper {...wrapperProps}>{cloneChildren}</FocusWrapper>
                </BaseContext.Provider>
            );
        }
        return null;
    }
}

export function DRouter(props: any) {
    return (
        <BaseContext.Consumer>
            {(baseContext) => (
                <Location>
                    {(locationContext) => (
                        <RouteImpl {...baseContext} {...locationContext} {...props} />
                    )}
                </Location>
            )}
        </BaseContext.Consumer>
    );
}
