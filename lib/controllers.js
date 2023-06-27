'use strict';

const categories = require.main.require('./src/categories');
const db = require.main.require('./src/database');
const events = require.main.require('./src/events');
const utils = require.main.require('./src/utils');

const undelete = require('./undelete');

const {
	PLUGIN_EVENT_NAME,
	PLUGIN_ID,
} = require('../config');

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res) {
	const data = await getEvents(req.query);
	res.render(`admin/plugins/${PLUGIN_ID}`, data);
};

async function getEvents(query, eventData = []) {
	const EVENT_TYPE = 'user-deleteAccount';

	// Trim and lowercase string filters
	query = Object.fromEntries(
		Object.entries(query).map(([key, val]) => [key, val.trim ? val.trim().toLowerCase() : val])
	);

	const page = parseInt(query.page, 10) || 1;
	const ITEMS_PER_PAGE = 30;
	const start = (page - 1) * ITEMS_PER_PAGE;
	const stop = start + ITEMS_PER_PAGE - 1;

	// Limit by date
	let from = query.start ? new Date(query.start) || undefined : undefined;
	let to = query.end ? new Date(query.end) || undefined : new Date();
	from = from && from.setHours(0, 0, 0, 0);	// setHours returns a unix timestamp (Number, not Date)
	to = to && to.setHours(23, 59, 59, 999);	// setHours returns a unix timestamp (Number, not Date)

	const [eventCount, newEventData] = await Promise.all([
		db.sortedSetCount(`events:time:${EVENT_TYPE}`, from || '-inf', to),
		events.getEvents(EVENT_TYPE, start, stop, from || '-inf', to),
	]);
	eventData = eventData.concat(newEventData);
	eventData.forEach((event) => {
		event.data = JSON.parse(event.jsonString);
		event.hide = filterEvent(event, query);
	});
	hideDuplicateUids(eventData);
	await hideExistingUids(eventData);
	await addContentCounts(eventData);

	const itemsLeft = eventCount - (ITEMS_PER_PAGE * page);
	const visibleEventCount = eventData.filter(ev => !ev.hide).length;
	if (visibleEventCount < ITEMS_PER_PAGE && itemsLeft > 0) {
		query.page = page + 1;
		return getEvents(query, eventData);
	}

	return {
		events: eventData,
		loadMore: eventCount > ITEMS_PER_PAGE * page,
		loadPage: page + 1,
		query,
		visibleEventCount,
	};
}

function filterEvent(event, { username, uid, email }) {
	return (username && event.data.username.toLowerCase().indexOf(username) === -1) ||
		(uid && parseInt(event.data.targetUid, 10) !== parseInt(uid, 10)) ||
		(email && event.data.email.toLowerCase().indexOf(email) === -1);
}

function hideDuplicateUids(events) {
	const uids = events.map(ev => ev.data.targetUid);
	events.forEach((ev, idx) => {
		const duplicate = uids.indexOf(ev.data.targetUid) !== idx;
		if (duplicate && !ev.hide && !events[idx].hide) {
			ev.hide = true;
		}
	});
}

async function hideExistingUids(events) {
	const uids = events.filter(ev => !ev.hide).map(ev => ev.data.targetUid);
	const isMembers = await db.isSortedSetMembers('users:joindate', uids);
	const existingUids = uids.filter((uid, idx) => isMembers[idx]);
	events.forEach((ev) => {
		ev.hide = ev.hide || existingUids.includes(ev.data.targetUid);
	});
}

async function addContentCounts(events) {
	const cids = await categories.getAllCidsFromSet('categories:cid');

	for (const ev of events) {
		/* eslint-disable no-await-in-loop */
		const [postCount, reputation, topicCount] = await getContentCountsFromCids(cids, ev.targetUid);
		ev.postCount = postCount;
		ev.reputation = reputation;
		ev.topicCount = topicCount;
	}
}

async function getContentCountsFromCids(cids, uid) {
	return Promise.all([
		db.sortedSetsCardSum(cids.map(c => `cid:${c}:uid:${uid}:pids`)),
		db.sortedSetsCardSum(cids.map(c => `cid:${c}:uid:${uid}:pids:votes`)),
		db.sortedSetsCardSum(cids.map(c => `cid:${c}:uid:${uid}:tids`)),
	]);
}

Controllers.undelete = async function (apiHelpers, req, res) {
	const { eid } = req.body;
	const event = await db.getObject(`event:${eid}`);

	if (!event) {
		return apiHelpers.formatApiResponse(400, res);
	}

	const cids = await categories.getAllCidsFromSet('categories:cid');
	const [postCount, reputation, topicCount] = await getContentCountsFromCids(cids, event.targetUid);

	const userData = {
		email: event.email,
		password: utils.generateUUID().slice(0, 8),
		postcount: postCount,
		reputation: reputation,
		topiccount: topicCount,
		uid: event.targetUid,
		username: event.username,
	};

	await undelete.create(userData);
	await events.log({
		email: userData.email,
		ip: req.ip,
		targetUid: userData.uid,
		type: PLUGIN_EVENT_NAME,
		uid: req.uid,
		username: userData.username,
	});

	return apiHelpers.formatApiResponse(200, res, { tmpPassword: userData.password });
};
