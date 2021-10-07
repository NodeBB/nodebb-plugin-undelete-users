'use strict';

const events = require.main.require('./src/events');
const routeHelpers = require.main.require('./src/routes/helpers');

const controllers = require('./lib/controllers');

const {
	EVENT_NAME,
	PLUGIN_ID,
	PLUGIN_NAME,
} = require('./config');

const plugin = module.exports;

events.types.push(EVENT_NAME);

plugin.init = async (params) => {
	const { router, middleware } = params;
	routeHelpers.setupAdminPageRoute(router, `/admin/plugins/${PLUGIN_ID}`, middleware, [], controllers.renderAdminPage);
};

plugin.addRoutes = async ({ router, middleware, helpers }) => {
	routeHelpers.setupApiRoute(router, 'post', `/${PLUGIN_ID}/undelete/`, [middleware.admin.checkPrivileges], controllers.undelete.bind(null, helpers));
};

plugin.addAdminNavigation = (header) => {
	header.plugins.push({
		route: `/plugins/${PLUGIN_ID}`,
		icon: 'fa-tint',
		name: PLUGIN_NAME,
	});

	return header;
};
