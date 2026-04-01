namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorKeyboardCharCommand : ActionEditorCommand
    {
        private const String KeyboardKeyControlName = "KeyboardKey";

        public ActionEditorKeyboardCharCommand()
        {
            this.DisplayName = "Action Editor / KeyboardChar";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorKeyboardKey(name: KeyboardKeyControlName, labelText: "Char")
                .SetBehavior(ActionEditorKeyboardKeyBehavior.KeyboardChar));
        }
    }
}
