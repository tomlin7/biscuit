from biscuit.language.signature_help import SignatureHelpController, SignatureInfo, ParameterInfo

def test_signature_help():
    ctrl = SignatureHelpController()
    sig = SignatureInfo(
        label="add(a: int, b: int) -> int",
        parameters=[ParameterInfo("a: int"), ParameterInfo("b: int")],
    )
    ctrl.update_signature(sig)
    assert ctrl.is_visible
    assert len(ctrl.active_signature.parameters) == 2

    assert ctrl.compute_active_parameter("add(10, ") == 1
    assert ctrl.compute_active_parameter("add(10, 20, ") == 2

    ctrl.dismiss()
    assert not ctrl.is_visible
