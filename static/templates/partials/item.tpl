<li data-type="item" class="list-group-item{{{ if events.hide }}} hidden{{{ end }}}">
    <div class="row">
        <div class="col-9">
            <div><strong>Username:</strong> {events.data.username} <span class="text-sm">(uid {events.data.targetUid})</span></div>
            {{{ if events.data.email }}}
            <div><strong>Email:</strong> {events.data.email}</div>
            {{{ end }}}
            <div><strong>Content to associate with:</strong> <span class="label label-info">{events.topicCount}</span> topics and <span class="label label-info">{events.postCount}</span> posts, with <span class="label label-info">{events.reputation}</span> reputation</div>
        </div>
        <div class="col-3 text-end">
            <button type="button" data-eid="{events.eid}" class="btn btn-sm btn-warning undelete">Undelete</button>
        </div>
        <div class="col-12 d-flex justify-content-end mt-3 text-sm">
            <div class="deleted-by">Deleted by <a href="{config.relative_path}/user/{events.user.userslug}" target="_blank">{events.user.username}</a> on {events.timestampISO}</div>
        </div>
    </div>
</li>
