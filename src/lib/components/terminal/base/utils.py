import threading


def _bind(cls=None, *ags, **kw):
    """
    Internal function.\n
    Binds and unbinds sequences with any name given as className.
    """
    cls = cls or kw.pop('cls', ags.pop(0))
    if ags:
        return [_bind(cls=cls, **i) for i in ags]
    classname = kw['className'] + str(cls)
    bindtags = list(cls.bindtags())
    if classname in bindtags:
        bindtags.remove(classname)
    if kw.get('func'):
        _bind(cls, className=kw['className'], sequence=kw['sequence'])
        bindtags.append(classname)
        cls.bindtags(tuple(bindtags))
        return cls.bind_class(classname, sequence=kw['sequence'],
                              func=kw['func'], add=kw.get('add', '+'))
    cls.bindtags(tuple(bindtags))
    cls.unbind_class(classname, kw['sequence'])


def threaded(fn=None, **kw):
    """
    To use as decorator to make a function call threaded.
    takes function as argument. To join=True pass @threaded(True).
    """

    def wrapper(*args, **kwargs):
        kw['return'] = kw['function'](*args, **kwargs)

    def _threaded(fn):
        kw['function'] = fn

        def thread_func(*args, **kwargs):
            thread = threading.Thread(
                target=wrapper, args=args,
                kwargs=kwargs, daemon=kw.get('daemon', True))
            thread.start()
            if kw.get('join'):
                thread.join()
            return kw.get('return', thread)
        return thread_func

    if fn and callable(fn):
        return _threaded(fn)
    return _threaded
